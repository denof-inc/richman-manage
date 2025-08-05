import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { CreateLoanSchema, LoanQuerySchema, LoanResponseSchema } from '@/lib/api/schemas/loan';
import { z } from 'zod';

// GET /api/loans - 借入一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // クエリパラメータをパース
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = LoanQuerySchema.parse(searchParams);

    // データベースクエリ構築（物件情報と結合してユーザーの借入のみ取得）
    let dbQuery = supabase
      .from('loans')
      .select('*, property:properties!inner(id, user_id, name)', { count: 'exact' })
      .eq('property.user_id', user.id);

    // 検索フィルタ
    if (query.search) {
      dbQuery = dbQuery.ilike('lender_name', `%${query.search}%`);
    }

    // 物件IDフィルタ
    if (query.property_id) {
      dbQuery = dbQuery.eq('property_id', query.property_id);
    }

    // 借入タイプフィルタ
    if (query.loan_type) {
      dbQuery = dbQuery.eq('loan_type', query.loan_type);
    }

    // ソート
    dbQuery = dbQuery.order(query.sort, { ascending: query.order === 'asc' });

    // ページネーション
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    const { data, error, count } = await dbQuery.range(from, to);

    if (error) {
      console.error('Database error:', error);
      return ApiResponse.internalError('データベースエラーが発生しました');
    }

    // レスポンス形式に変換（property情報を除外）
    const loans =
      data?.map((loan) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { property, ...loanData } = loan;
        return LoanResponseSchema.parse(loanData);
      }) || [];

    return ApiResponse.paginated(loans, query.page, query.limit, count || 0);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.validationError('バリデーションエラー', error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// POST /api/loans - 借入作成
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // リクエストボディをパース
    const body = await request.json();
    const validatedData = CreateLoanSchema.parse(body);

    // 物件の所有権確認
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', validatedData.property_id)
      .eq('user_id', user.id)
      .single();

    if (propertyError || !property) {
      return ApiResponse.forbidden('この物件に対する借入を作成する権限がありません');
    }

    // データベースに借入情報を保存
    const { data: newLoan, error: dbError } = await supabase
      .from('loans')
      .insert({
        property_id: validatedData.property_id,
        lender_name: validatedData.lender_name,
        loan_type: validatedData.loan_type,
        principal_amount: validatedData.principal_amount,
        current_balance: validatedData.current_balance,
        interest_rate: validatedData.interest_rate,
        loan_term_months: validatedData.loan_term_months,
        monthly_payment: validatedData.monthly_payment,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return ApiResponse.internalError('借入情報の保存に失敗しました');
    }

    // レスポンス形式に変換
    const loanResponse = LoanResponseSchema.parse(newLoan);

    return ApiResponse.success(loanResponse, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
