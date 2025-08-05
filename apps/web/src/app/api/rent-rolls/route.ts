import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import {
  CreateRentRollSchema,
  RentRollQuerySchema,
  RentRollResponseSchema,
} from '@/lib/api/schemas/rent-roll';
import { z } from 'zod';
import { getCache } from '@/lib/cache/redis-cache';
import { extractPaginationParams, calculatePaginationMeta } from '@/lib/api/pagination';

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

    // クエリ実行
    const { data, error, count } = await dbQuery.range(from, to);

    if (error) {
      console.error('Database error:', error);
      return ApiResponse.internalError('データベースエラーが発生しました');
    }

    // レスポンス形式に変換（property情報を除外）
    const rentRolls =
      data?.map((rentRoll) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { property, ...rentRollData } = rentRoll;
        return RentRollResponseSchema.parse(rentRollData);
      }) || [];

    // ページネーションメタデータを計算
    const meta = calculatePaginationMeta(paginationParams, count || 0);

    return ApiResponse.paginated(rentRolls, meta.page, meta.limit, meta.total);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.validationError('バリデーションエラー', error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// POST /api/rent-rolls - レントロール作成
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
    const validatedData = CreateRentRollSchema.parse(body);

    // 物件の所有権確認
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', validatedData.property_id)
      .eq('user_id', user.id)
      .single();

    if (propertyError || !property) {
      return ApiResponse.forbidden('この物件に対するレントロールを作成する権限がありません');
    }

    // 同じ物件内での部屋番号の重複チェック
    const { data: existingRoom, error: duplicateError } = await supabase
      .from('rent_rolls')
      .select('id')
      .eq('property_id', validatedData.property_id)
      .eq('room_number', validatedData.room_number)
      .single();

    if (!duplicateError && existingRoom) {
      return ApiResponse.conflict('この部屋番号は既に登録されています');
    }

    // データベースにレントロール情報を保存
    const { data: newRentRoll, error: dbError } = await supabase
      .from('rent_rolls')
      .insert({
        property_id: validatedData.property_id,
        room_number: validatedData.room_number,
        tenant_name: validatedData.tenant_name || null,
        monthly_rent: validatedData.monthly_rent,
        occupancy_status: validatedData.occupancy_status,
        lease_start_date: validatedData.lease_start_date || null,
        lease_end_date: validatedData.lease_end_date || null,
        security_deposit: validatedData.security_deposit || null,
        key_money: validatedData.key_money || null,
        notes: validatedData.notes || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return ApiResponse.internalError('レントロール情報の保存に失敗しました');
    }

    // レスポンス形式に変換
    const rentRollResponse = RentRollResponseSchema.parse(newRentRoll);

    // ユーザー固有のキャッシュを無効化
    await cache.invalidateResource('rent-rolls', user.id);

    return ApiResponse.success(rentRollResponse, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
