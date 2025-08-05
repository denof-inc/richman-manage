import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { UpdateRentRollSchema, RentRollResponseSchema } from '@/lib/api/schemas/rent-roll';
import { z } from 'zod';

// GET /api/rent-rolls/[id] - レントロール詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient();
    const { id: rentRollId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // レントロール取得（物件の所有者チェック込み）
    const { data: rentRoll, error } = await supabase
      .from('rent_rolls')
      .select('*, property:properties!inner(user_id)')
      .eq('id', rentRollId)
      .eq('property.user_id', user.id)
      .single();

    if (error || !rentRoll) {
      return ApiResponse.notFound('レントロールが見つかりません');
    }

    // レスポンス形式に変換（property情報を除外）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { property, ...rentRollData } = rentRoll;
    const rentRollResponse = RentRollResponseSchema.parse(rentRollData);

    return ApiResponse.success(rentRollResponse);
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// PUT /api/rent-rolls/[id] - レントロール更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient();
    const { id: rentRollId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 既存レントロールの確認（物件の所有者チェック込み）
    const { data: existingRentRoll, error: fetchError } = await supabase
      .from('rent_rolls')
      .select('*, property:properties!inner(user_id)')
      .eq('id', rentRollId)
      .eq('property.user_id', user.id)
      .single();

    if (fetchError || !existingRentRoll) {
      return ApiResponse.notFound('レントロールが見つかりません');
    }

    // リクエストボディをパース
    const body = await request.json();
    const validatedData = UpdateRentRollSchema.parse(body);

    // 入居状況が空室に変更される場合、入居者関連情報をクリア
    const updateData = { ...validatedData };
    if (validatedData.occupancy_status === 'vacant') {
      updateData.tenant_name = null;
      updateData.lease_start_date = null;
      updateData.lease_end_date = null;
    }

    // レントロールを更新
    const { data: updatedRentRoll, error: updateError } = await supabase
      .from('rent_rolls')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rentRollId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return ApiResponse.internalError('レントロールの更新に失敗しました');
    }

    // レスポンス形式に変換
    const rentRollResponse = RentRollResponseSchema.parse(updatedRentRoll);

    return ApiResponse.success(rentRollResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// DELETE /api/rent-rolls/[id] - レントロール削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const { id: rentRollId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 既存レントロールの確認（物件の所有者チェック込み）
    const { data: existingRentRoll, error: fetchError } = await supabase
      .from('rent_rolls')
      .select('*, property:properties!inner(user_id)')
      .eq('id', rentRollId)
      .eq('property.user_id', user.id)
      .single();

    if (fetchError || !existingRentRoll) {
      return ApiResponse.notFound('レントロールが見つかりません');
    }

    // 論理削除
    const { error: deleteError } = await supabase
      .from('rent_rolls')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', rentRollId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return ApiResponse.internalError('レントロールの削除に失敗しました');
    }

    return ApiResponse.success({ message: 'レントロールを削除しました' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
