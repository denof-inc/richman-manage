import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import {
  CreatePropertySchema,
  PropertyQuerySchema,
  PropertyResponseSchema,
} from '@/lib/api/schemas/property';
import { z } from 'zod';

// GET /api/properties - 物件一覧取得
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
    const query = PropertyQuerySchema.parse(searchParams);

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

    // レスポンス形式に変換
    const properties = data?.map((property) => PropertyResponseSchema.parse(property)) || [];

    return ApiResponse.paginated(properties, query.page, query.limit, count || 0);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.validationError('バリデーションエラー', error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// POST /api/properties - 物件作成
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
