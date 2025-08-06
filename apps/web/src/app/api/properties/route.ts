import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import {
  CreatePropertySchema,
  PropertyQuerySchema,
  PropertyResponseSchema,
} from '@/lib/api/schemas/property';
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

// GET /api/properties - 物件一覧取得
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
        'properties.database.query'
      );

      if (error) {
        throw error;
      }

      // レスポンス形式に変換
      const properties = data?.map((property) => PropertyResponseSchema.parse(property)) || [];

      // ページネーションメタデータを計算
      const meta = calculatePaginationMeta(paginationParams, count || 0);

      return ApiResponse.paginated(properties, meta.page, meta.limit, meta.total);
    } catch (error) {
      return handleApiError(error, 'GET /api/properties');
    }
  }, 'GET /api/properties');
}

// POST /api/properties - 物件作成
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
      const validatedData = CreatePropertySchema.parse(body);

      // データベースに物件情報を保存
      const { data: newProperty, error: dbError } = await withPerformanceMonitoring(
        () =>
          supabase
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
            .single(),
        'properties.database.insert'
      );

      if (dbError) {
        throw dbError;
      }

      // レスポンス形式に変換
      const propertyResponse = PropertyResponseSchema.parse(newProperty);

      // ユーザー固有のキャッシュを無効化
      await cache.invalidateResource('properties', user.id);

      return ApiResponse.success(propertyResponse, undefined, 201);
    } catch (error) {
      return handleApiError(error, 'POST /api/properties');
    }
  }, 'POST /api/properties');
}
