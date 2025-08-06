import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { CreateLoanSchema, LoanQuerySchema, LoanResponseSchema } from '@/lib/api/schemas/loan';
import { z } from 'zod';
import { getCache } from '@/lib/cache/redis-cache';
import { extractPaginationParams, calculatePaginationMeta } from '@/lib/api/pagination';

// パフォーマンス監視ユーティリティ（Edge Runtime対応）
const withPerformanceMonitoring = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = performance.now();

  try {
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        operation: operationName,
        duration: Math.round(duration * 100) / 100,
        status: 'success',
      })
    );

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        operation: operationName,
        duration: Math.round(duration * 100) / 100,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    throw error;
  }
};

// 統一エラーハンドリング（Edge Runtime対応）
const handleApiError = (error: unknown, context: string) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  };

  console.error('API Error:', JSON.stringify(errorInfo));

  if (error instanceof z.ZodError) {
    const messages = error.errors.map((e) => e.message).join(', ');
    return ApiResponse.validationError(messages, error.errors);
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code: string; message: string };
    if (supabaseError.code === 'PGRST116') {
      return ApiResponse.notFound('リソースが見つかりません');
    }
    return ApiResponse.badRequest(supabaseError.message);
  }

  return ApiResponse.internalError('予期しないエラーが発生しました');
};

// GET /api/loans - 借入一覧取得
export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
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

      // ページネーションパラメータを抽出
      const paginationParams = extractPaginationParams(request.nextUrl);

      // その他のクエリパラメータをパース
      const searchParams = Object.fromEntries(request.nextUrl.searchParams);
      const query = {
        ...LoanQuerySchema.parse(searchParams),
        ...paginationParams,
      };

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

      // ソート適用
      if (paginationParams.sort) {
        dbQuery = dbQuery.order(paginationParams.sort, {
          ascending: paginationParams.order === 'asc',
        });
      }

      // ページネーション範囲適用
      const from = (paginationParams.page - 1) * paginationParams.limit;
      const to = from + paginationParams.limit - 1;

      // クエリ実行（パフォーマンス監視付き）
      const { data, error, count } = await withPerformanceMonitoring(
        () => dbQuery.range(from, to),
        'loans.database.query'
      );

      if (error) {
        throw error;
      }

      // レスポンス形式に変換（property情報を除外）
      const loans =
        data?.map((loan) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { property, ...loanData } = loan;
          return LoanResponseSchema.parse(loanData);
        }) || [];

      // ページネーションメタデータを計算
      const meta = calculatePaginationMeta(paginationParams, count || 0);

      return ApiResponse.paginated(loans, meta.page, meta.limit, meta.total);
    } catch (error) {
      return handleApiError(error, 'GET /api/loans');
    }
  }, 'GET /api/loans');
}

// POST /api/loans - 借入作成
export async function POST(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    try {
      const supabase = createClient();
      const cache = getCache();

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
      const { data: property, error: propertyError } = await withPerformanceMonitoring(
        () =>
          supabase
            .from('properties')
            .select('id')
            .eq('id', validatedData.property_id)
            .eq('user_id', user.id)
            .single(),
        'loans.check.property_ownership'
      );

      if (propertyError || !property) {
        return ApiResponse.forbidden('この物件に対する借入を作成する権限がありません');
      }

      // データベースに借入情報を保存
      const { data: newLoan, error: dbError } = await withPerformanceMonitoring(
        () =>
          supabase
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
            .single(),
        'loans.database.insert'
      );

      if (dbError) {
        throw dbError;
      }

      // レスポンス形式に変換
      const loanResponse = LoanResponseSchema.parse(newLoan);

      // ユーザー固有のキャッシュを無効化
      await cache.invalidateResource('loans', user.id);

      return ApiResponse.success(loanResponse, undefined, 201);
    } catch (error) {
      return handleApiError(error, 'POST /api/loans');
    }
  }, 'POST /api/loans');
}
