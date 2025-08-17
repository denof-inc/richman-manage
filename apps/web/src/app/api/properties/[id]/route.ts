import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { UpdatePropertySchema, PropertyResponseSchema } from '@/lib/api/schemas/property';
import { z } from 'zod';

// GET /api/properties/[id] - 物件詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient();
    const { id: propertyId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 物件取得（所有者チェック込み）
    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (error || !property) {
      return ApiResponse.notFound('物件が見つかりません');
    }

    // レスポンス形式に変換
    const propertyResponse = PropertyResponseSchema.parse(property);

    return ApiResponse.success(propertyResponse);
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// PUT /api/properties/[id] - 物件更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient();
    const { id: propertyId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 既存物件の確認（所有者チェック込み）
    const { data: existingProperty, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingProperty) {
      return ApiResponse.notFound('物件が見つかりません');
    }

    // リクエストボディをパース
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const validatedData = UpdatePropertySchema.parse(body);

    // 物件を更新
    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return ApiResponse.internalError('物件の更新に失敗しました');
    }

    // レスポンス形式に変換
    const propertyResponse = PropertyResponseSchema.parse(updatedProperty);

    return ApiResponse.success(propertyResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// DELETE /api/properties/[id] - 物件削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const { id: propertyId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 既存物件の確認（所有者チェック込み）
    const { data: existingProperty, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingProperty) {
      return ApiResponse.notFound('物件が見つかりません');
    }

    // 論理削除
    const { error: deleteError } = await supabase
      .from('properties')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', propertyId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return ApiResponse.internalError('物件の削除に失敗しました');
    }

    return ApiResponse.success({ message: '物件を削除しました' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
