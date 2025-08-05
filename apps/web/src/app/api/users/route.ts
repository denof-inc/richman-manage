import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { CreateUserSchema, UserQuerySchema, UserResponseSchema } from '@/lib/api/schemas/user';
import { z } from 'zod';
import { getCache } from '@/lib/cache/redis-cache';
import { extractPaginationParams, calculatePaginationMeta } from '@/lib/api/pagination';

// GET /api/users - ユーザー一覧取得
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

    // クエリ実行
    const { data, error, count } = await dbQuery.range(from, to);

    if (error) {
      console.error('Database error:', error);
      return ApiResponse.internalError('データベースエラーが発生しました');
    }

    // レスポンス形式に変換
    const users = data?.map((user) => UserResponseSchema.parse(user)) || [];

    // ページネーションメタデータを計算
    const meta = calculatePaginationMeta(paginationParams, count || 0);

    return ApiResponse.paginated(users, meta.page, meta.limit, meta.total);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.validationError('バリデーションエラー', error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// POST /api/users - ユーザー作成
export async function POST(request: NextRequest) {
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
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || currentUser.role !== 'admin') {
      return ApiResponse.forbidden('管理者権限が必要です');
    }

    // リクエストボディをパース
    const body = await request.json();
    const validatedData = CreateUserSchema.parse(body);

    // Supabase Authでユーザー作成
    const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      email_confirm: true,
      user_metadata: {
        name: validatedData.name,
        role: validatedData.role,
      },
    });

    if (createAuthError) {
      if (createAuthError.message.includes('already registered')) {
        return ApiResponse.conflict('このメールアドレスは既に登録されています');
      }
      console.error('Auth creation error:', createAuthError);
      return ApiResponse.internalError('ユーザー作成に失敗しました');
    }

    // データベースにユーザー情報を保存
    const { data: newUser, error: dbError } = await supabase
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
      .single();

    if (dbError) {
      // Auth側のユーザーを削除（ロールバック）
      await supabase.auth.admin.deleteUser(authData.user!.id);
      console.error('Database error:', dbError);
      return ApiResponse.internalError('ユーザー情報の保存に失敗しました');
    }

    // レスポンス形式に変換
    const userResponse = UserResponseSchema.parse(newUser);

    // キャッシュを無効化
    await cache.invalidateResource('users');

    return ApiResponse.success(userResponse, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
