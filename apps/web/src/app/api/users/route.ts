import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { CreateUserSchema, UserQuerySchema, UserResponseSchema } from '@/lib/api/schemas/user';
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

    // Edge Runtime対応のパフォーマンスログ
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
  // Edge Runtime対応のエラーログ記録
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? sanitizeErrorMessage(error.message) : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  };

  console.error('API Error:', JSON.stringify(errorInfo));

  // エラータイプに基づく適切なレスポンス生成
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

// GET /api/users - ユーザー一覧取得
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
        ...UserQuerySchema.parse(searchParams),
        ...paginationParams,
      };

      // データベースクエリ構築
      let dbQuery = supabase.from('users').select('*', { count: 'exact' });

      // 検索フィルタ
      if (query.search) {
        dbQuery = dbQuery.ilike('name', `%${query.search}%`);
      }

      // ロールフィルタ
      if (query.role) {
        dbQuery = dbQuery.eq('role', query.role);
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
        async () => await dbQuery.range(from, to),
        'users.database.query'
      );

      if (error) {
        throw error;
      }

      // レスポンス形式に変換
      const users = data?.map((user) => UserResponseSchema.parse(user)) || [];

      // ページネーションメタデータを計算
      const meta = calculatePaginationMeta(paginationParams, count || 0);

      return ApiResponse.paginated(users, meta.page, meta.limit, meta.total);
    } catch (error) {
      return handleApiError(error, 'GET /api/users');
    }
  }, 'GET /api/users');
}

// POST /api/users - ユーザー作成
export async function POST(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    try {
      const supabase = createClient();
      const cache = getCache();

      // 認証チェック（管理者のみ）
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return ApiResponse.unauthorized();
      }

      // 管理者権限チェック
      const { data: currentUser } = await withPerformanceMonitoring(
        async () => await supabase.from('users').select('role').eq('id', user.id).single(),
        'users.check.admin'
      );

      if (!currentUser || currentUser.role !== 'admin') {
        return ApiResponse.forbidden('管理者権限が必要です');
      }

      // リクエストボディをパース
      const body = await request.json();
      const validatedData = CreateUserSchema.parse(body);

      // Supabase Authでユーザー作成
      const { data: authData, error: createAuthError } = await withPerformanceMonitoring(
        async () =>
          await supabase.auth.admin.createUser({
            email: validatedData.email,
            password: validatedData.password,
            email_confirm: true,
            user_metadata: {
              name: validatedData.name,
              role: validatedData.role,
            },
          }),
        'users.auth.create'
      );

      if (createAuthError) {
        if (createAuthError.message.includes('already registered')) {
          return ApiResponse.conflict('このメールアドレスは既に登録されています');
        }
        throw createAuthError;
      }

      // データベースにユーザー情報を保存
      const { data: newUser, error: dbError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('users')
            .insert({
              id: authData.user!.id,
              email: validatedData.email,
              name: validatedData.name,
              role: validatedData.role,
              timezone: 'Asia/Tokyo',
              language: 'ja',
            })
            .select()
            .single(),
        'users.database.insert'
      );

      if (dbError) {
        // Auth側のユーザーを削除（ロールバック）
        await supabase.auth.admin.deleteUser(authData.user!.id);
        throw dbError;
      }

      // レスポンス形式に変換
      const userResponse = UserResponseSchema.parse(newUser);

      // キャッシュを無効化
      await cache.invalidateResource('users');

      return ApiResponse.success(userResponse, undefined, 201);
    } catch (error) {
      return handleApiError(error, 'POST /api/users');
    }
  }, 'POST /api/users');
}
