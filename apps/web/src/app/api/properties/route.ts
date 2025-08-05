import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import {
  CreatePropertySchema,
  PropertyQuerySchema,
  PropertyResponseSchema,
} from '@/lib/api/schemas/property';
import { z } from 'zod';
import { withCache, getCache } from '@/lib/cache/redis-cache';
import {
  extractPaginationParams,
  applyPagination,
  calculatePaginationMeta,
} from '@/lib/api/pagination';

// ユーザーID取得ヘルパー
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getUserId(request: Request): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

// GET /api/properties - 物件一覧取得
const getPropertiesHandler = async (request: NextRequest) => {
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
      ...PropertyQuerySchema.parse(searchParams),
      ...paginationParams,
    };

    // データベースクエリ構築
    let dbQuery = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id); // ユーザーの物件のみ取得

    // 検索フィルタ
    if (query.search) {
      dbQuery = dbQuery.or(`name.ilike.%${query.search}%,address.ilike.%${query.search}%`);
    }

    // 物件タイプフィルタ
    if (query.property_type) {
      dbQuery = dbQuery.eq('property_type', query.property_type);
    }

    // ページネーションを適用
    dbQuery = applyPagination(dbQuery, paginationParams);

    // クエリ実行
    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      return ApiResponse.internalError('データベースエラーが発生しました');
    }

    // レスポンス形式に変換
    const properties = data?.map((property) => PropertyResponseSchema.parse(property)) || [];

    // ページネーションメタデータを計算
    const meta = calculatePaginationMeta(paginationParams, count || 0);

    return ApiResponse.paginated(properties, meta.page, meta.limit, meta.total);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.validationError('バリデーションエラー', error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
};

// キャッシュを適用
export const GET = withCache(getPropertiesHandler, {
  resource: 'properties',
  ttl: 300, // 5分
  getUserId,
});

// POST /api/properties - 物件作成
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
    const validatedData = CreatePropertySchema.parse(body);

    // データベースに物件情報を保存
    const { data: newProperty, error: dbError } = await supabase
      .from('properties')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        address: validatedData.address,
        property_type: validatedData.property_type,
        purchase_price: validatedData.purchase_price,
        purchase_date: validatedData.purchase_date,
        current_valuation: validatedData.current_valuation || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return ApiResponse.internalError('物件情報の保存に失敗しました');
    }

    // レスポンス形式に変換
    const propertyResponse = PropertyResponseSchema.parse(newProperty);

    // ユーザー固有のキャッシュを無効化
    await cache.invalidateResource('properties', user.id);

    return ApiResponse.success(propertyResponse, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
