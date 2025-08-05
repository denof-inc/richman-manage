import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import {
  CreateExpenseSchema,
  ExpenseQuerySchema,
  ExpenseResponseSchema,
} from '@/lib/api/schemas/expense';
import { z } from 'zod';
import { getCache } from '@/lib/cache/redis-cache';
import { extractPaginationParams, calculatePaginationMeta } from '@/lib/api/pagination';

// GET /api/expenses - 支出一覧取得
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

    // ページネーションパラメータを抽出
    const paginationParams = extractPaginationParams(request.nextUrl);

    // その他のクエリパラメータをパース
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = {
      ...ExpenseQuerySchema.parse(searchParams),
      ...paginationParams,
    };

    // データベースクエリ構築（物件情報と結合してユーザーの支出のみ取得）
    let dbQuery = supabase
      .from('expenses')
      .select('*, property:properties!inner(id, user_id, name)', { count: 'exact' })
      .eq('property.user_id', user.id);

    // 物件IDフィルタ
    if (query.property_id) {
      dbQuery = dbQuery.eq('property_id', query.property_id);
    }

    // カテゴリーフィルタ
    if (query.category) {
      dbQuery = dbQuery.eq('category', query.category);
    }

    // 日付範囲フィルタ
    if (query.start_date) {
      dbQuery = dbQuery.gte('expense_date', query.start_date);
    }
    if (query.end_date) {
      dbQuery = dbQuery.lte('expense_date', query.end_date);
    }

    // 金額範囲フィルタ
    if (query.min_amount !== undefined) {
      dbQuery = dbQuery.gte('amount', query.min_amount);
    }
    if (query.max_amount !== undefined) {
      dbQuery = dbQuery.lte('amount', query.max_amount);
    }

    // 定期支出フィルタ
    if (query.is_recurring !== undefined) {
      dbQuery = dbQuery.eq('is_recurring', query.is_recurring);
    }

    // 検索フィルタ（ベンダー名または説明）
    if (query.search) {
      dbQuery = dbQuery.or(`vendor.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }

    // ソート適用
    if (paginationParams.sort) {
      dbQuery = dbQuery.order(paginationParams.sort, {
        ascending: paginationParams.order === 'asc',
      });
    } else {
      // デフォルトは支出日の降順
      dbQuery = dbQuery.order('expense_date', { ascending: false });
    }

    // ページネーション範囲適用
    const from = (paginationParams.page - 1) * paginationParams.limit;
    const to = from + paginationParams.limit - 1;

    // クエリ実行
    const { data, error, count } = await dbQuery.range(from, to);

    if (error) {
      console.error('Database error:', error);
      return ApiResponse.internalError('データベースエラーが発生しました');
    }

    // レスポンス形式に変換（property情報を除外）
    const expenses =
      data?.map((expense) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { property, ...expenseData } = expense;
        return ExpenseResponseSchema.parse(expenseData);
      }) || [];

    // ページネーションメタデータを計算
    const meta = calculatePaginationMeta(paginationParams, count || 0);

    return ApiResponse.paginated(expenses, meta.page, meta.limit, meta.total);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.validationError('バリデーションエラー', error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// POST /api/expenses - 支出作成
export async function POST(request: NextRequest) {
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
    const validatedData = CreateExpenseSchema.parse(body);

    // 物件の所有権確認
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', validatedData.property_id)
      .eq('user_id', user.id)
      .single();

    if (propertyError || !property) {
      return ApiResponse.forbidden('この物件に対する支出を作成する権限がありません');
    }

    // データベースに支出情報を保存
    const { data: newExpense, error: dbError } = await supabase
      .from('expenses')
      .insert({
        property_id: validatedData.property_id,
        expense_date: validatedData.expense_date,
        category: validatedData.category,
        amount: validatedData.amount,
        vendor: validatedData.vendor || null,
        description: validatedData.description || null,
        receipt_url: validatedData.receipt_url || null,
        is_recurring: validatedData.is_recurring,
        recurring_frequency: validatedData.recurring_frequency || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return ApiResponse.internalError('支出情報の保存に失敗しました');
    }

    // レスポンス形式に変換
    const expenseResponse = ExpenseResponseSchema.parse(newExpense);

    // ユーザー固有のキャッシュを無効化
    await cache.invalidateResource('expenses', user.id);

    return ApiResponse.success(expenseResponse, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
