import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import {
  CreateRentRollSchema,
  RentRollQuerySchema,
  RentRollResponseSchema,
} from '@/lib/api/schemas/rent-roll';
import { mapRentRollDbToDto } from '@/lib/mappers/rentRolls';
import { mapRentRollDtoToDbForCreate } from '@/lib/mappers/rentRolls';
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

const hasSupabaseCode = (e: unknown): e is { code: string; message: string } =>
  typeof e === 'object' && e !== null && 'code' in (e as Record<string, unknown>);

// 統一エラーハンドリング（Edge Runtime対応）
const handleApiError = (error: unknown, context: string) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? sanitizeErrorMessage(error.message) : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  };

  if (error instanceof z.ZodError) {
    console.warn('API Validation:', JSON.stringify(errorInfo));
  } else if (hasSupabaseCode(error)) {
    console.warn('API ClientError:', JSON.stringify(errorInfo));
  } else {
    console.error('API Error:', JSON.stringify(errorInfo));
  }

  if (error instanceof z.ZodError) {
    const messages = error.errors.map((e) => e.message).join(', ');
    return ApiResponse.validationError(messages, error.errors);
  }

  if (hasSupabaseCode(error)) {
    const supabaseError = error;
    if (supabaseError.code === 'PGRST116') {
      return ApiResponse.notFound('リソースが見つかりません');
    }
    return ApiResponse.badRequest(sanitizeErrorMessage(supabaseError.message));
  }

  return ApiResponse.internalError('予期しないエラーが発生しました');
};

// ユーザーID取得ヘルパー
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getUserId(request: Request): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

// GET /api/rent-rolls - レントロール一覧取得
/**
 * @swagger
 * /api/rent-rolls:
 *   get:
 *     tags: [RentRolls]
 *     summary: レントロール一覧を取得
 *     parameters:
 *       - in: query
 *         name: property_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: occupancy_status
 *         schema: { type: string, enum: [occupied, vacant, reserved] }
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
      const searchParams = request.nextUrl?.searchParams
        ? Object.fromEntries(request.nextUrl.searchParams)
        : {};
      const query = {
        ...RentRollQuerySchema.parse(searchParams),
        ...paginationParams,
      };

      // データベースクエリ構築（物件情報と結合してユーザーのレントロールのみ取得）
      let dbQuery = supabase
        .from('rent_rolls')
        .select('*, property:properties!inner(id, user_id, name)', { count: 'exact' })
        .eq('property.user_id', user.id);

      // 物件IDフィルタ
      if (query.property_id) {
        dbQuery = dbQuery.eq('property_id', query.property_id);
      }

      // 入居状況フィルタ
      if (query.occupancy_status) {
        dbQuery = dbQuery.eq('occupancy_status', query.occupancy_status);
      }

      // 検索フィルタ（部屋番号または入居者名）
      if (query.search) {
        dbQuery = dbQuery.or(
          `room_number.ilike.%${query.search}%,tenant_name.ilike.%${query.search}%`
        );
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
        'rent-rolls.database.query'
      );

      if (error) {
        throw error;
      }

      // レスポンス形式に変換（property情報を除外）+ DB→DTO正規化
      const rentRolls =
        data?.map((rentRoll) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { property, ...rentRollData } = rentRoll as Record<string, unknown>;
          const normalized = mapRentRollDbToDto(rentRollData);
          return RentRollResponseSchema.parse(normalized);
        }) || [];

      // ページネーションメタデータを計算
      const meta = calculatePaginationMeta(paginationParams, count || 0);

      return ApiResponse.paginated(rentRolls, meta.page, meta.limit, meta.total);
    } catch (error) {
      return handleApiError(error, 'GET /api/rent-rolls');
    }
  }, 'GET /api/rent-rolls');
}

// POST /api/rent-rolls - レントロール作成
/**
 * @swagger
 * /api/rent-rolls:
 *   post:
 *     tags: [RentRolls]
 *     summary: レントロールを作成
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRentRoll'
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
      const body = await (request.json ? request.json() : Promise.resolve({}));

      // バリデーション
      const validatedData = CreateRentRollSchema.parse(body);

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
          'rent-rolls.check.property_ownership'
        );

        if (propertyError || !property) {
          return ApiResponse.forbidden('この物件に対するレントロールを作成する権限がありません');
        }
      }

      // 同じ物件内での部屋番号の重複チェック
      const { data: existingRoom, error: duplicateError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('rent_rolls')
            .select('id')
            .eq('property_id', validatedData.property_id)
            .eq('room_number', validatedData.room_number)
            .single(),
        'rent-rolls.check.duplicate_room'
      );

      if (!duplicateError && existingRoom) {
        return ApiResponse.conflict('この部屋番号は既に登録されています');
      }

      // DTO→DB 変換（軽量適用）。既存スキーマ互換の安全キーのみ送信。
      const mapped = mapRentRollDtoToDbForCreate(validatedData);
      const safeInsert = {
        property_id: mapped.property_id,
        room_number: mapped.room_number,
        tenant_name: mapped.tenant_name,
        monthly_rent: mapped.monthly_rent,
        occupancy_status: validatedData.occupancy_status,
        lease_start_date: mapped.lease_start_date,
        lease_end_date: mapped.lease_end_date,
        security_deposit: validatedData.security_deposit ?? null,
        key_money: validatedData.key_money ?? null,
        notes: mapped.notes,
      } as const;

      // データベースにレントロール情報を保存
      const { data: newRentRoll, error: dbError } = await withPerformanceMonitoring(
        async () => await supabase.from('rent_rolls').insert(safeInsert).select().single(),
        'rent-rolls.database.insert'
      );

      if (dbError) {
        throw dbError;
      }

      // レスポンス形式に変換
      const rentRollResponse = RentRollResponseSchema.parse(newRentRoll);

      // ユーザー固有のキャッシュを無効化
      await cache.invalidateResource('rent-rolls', user.id);

      return ApiResponse.success(rentRollResponse, undefined, 201);
    } catch (error) {
      return handleApiError(error, 'POST /api/rent-rolls');
    }
  }, 'POST /api/rent-rolls');
}
