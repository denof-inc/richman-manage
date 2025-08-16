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

// エラーメッセージのサニタイズ
const sanitizeErrorMessage = (message: string): string => {
  // パスワードやトークンなどの機密情報を除去
  return message
    .replace(/password[=:][\S]+/gi, 'password=***')
    .replace(/token[=:][\S]+/gi, 'token=***')
    .replace(/secret[=:][\S]+/gi, 'secret=***')
    .replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***@')
    .replace(/mysql:\/\/[^@]+@/gi, 'mysql://***@')
    .replace(/mongodb:\/\/[^@]+@/gi, 'mongodb://***@');
};

// 統一エラーハンドリング（Edge Runtime対応）
const handleApiError = (error: unknown, context: string) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? sanitizeErrorMessage(error.message) : 'Unknown error',
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
    return ApiResponse.badRequest(sanitizeErrorMessage(supabaseError.message));
  }

  return ApiResponse.internalError('予期しないエラーが発生しました');
};

// GET /api/expenses - 支出一覧取得
/**
 * @swagger
 * /api/expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: 支出一覧を取得
 *     parameters:
 *       - in: query
 *         name: property_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: 成功
 */
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

      // クエリ実行（パフォーマンス監視付き）
      const { data, error, count } = await withPerformanceMonitoring(
        async () => await dbQuery.range(from, to),
        'expenses.database.query'
      );

      if (error) {
        throw error;
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
      return handleApiError(error, 'GET /api/expenses');
    }
  }, 'GET /api/expenses');
}

// POST /api/expenses - 支出作成
/**
 * @swagger
 * /api/expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: 支出を作成
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExpense'
 *     responses:
 *       201:
 *         description: 作成成功
 */
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

      // バリデーション
      const validatedData = CreateExpenseSchema.parse(body);

      // property_idが指定されている場合は所有権を確認
      if (validatedData.property_id) {
        const { data: property, error: propertyError } = await withPerformanceMonitoring(
          async () =>
            await supabase
              .from('properties')
              .select('id')
              .eq('id', validatedData.property_id)
              .eq('user_id', user.id)
              .single(),
          'expenses.check.property_ownership'
        );

        if (propertyError || !property) {
          return ApiResponse.forbidden('この物件に対する支出を作成する権限がありません');
        }
      }

      // データベースに支出情報を保存
      const { data: newExpense, error: dbError } = await withPerformanceMonitoring(
        async () =>
          await supabase
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
            .single(),
        'expenses.database.insert'
      );

      if (dbError) {
        throw dbError;
      }

      // レスポンス形式に変換
      const expenseResponse = ExpenseResponseSchema.parse(newExpense);

      // ユーザー固有のキャッシュを無効化
      await cache.invalidateResource('expenses', user.id);

      return ApiResponse.success(expenseResponse, undefined, 201);
    } catch (error) {
      return handleApiError(error, 'POST /api/expenses');
    }
  }, 'POST /api/expenses');
}
