import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { UpdateUserSchema, UserResponseSchema } from '@/lib/api/schemas/user';
import { z } from 'zod';

// GET /api/users/[id] - 特定ユーザー取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // ユーザー情報取得
    const { data, error } = await supabase.from('users').select('*').eq('id', params.id).single();

    if (error || !data) {
      return ApiResponse.notFound('ユーザーが見つかりません');
    }

    // 自分自身または管理者のみアクセス可能
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (params.id !== user.id && currentUser?.role !== 'admin') {
      return ApiResponse.forbidden('このユーザー情報へのアクセス権限がありません');
    }

    // レスポンス形式に変換
    const userResponse = UserResponseSchema.parse(data);

    return ApiResponse.success(userResponse);
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// PUT /api/users/[id] - ユーザー更新
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // 自分自身または管理者のみ更新可能
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (params.id !== user.id && currentUser?.role !== 'admin') {
      return ApiResponse.forbidden('このユーザーを更新する権限がありません');
    }

    // リクエストボディをパース
    const body = await request.json();
    const validatedData = UpdateUserSchema.parse(body);

    // ロール変更は管理者のみ可能
    if (validatedData.role && currentUser?.role !== 'admin') {
      return ApiResponse.forbidden('ロールの変更は管理者のみ可能です');
    }

    // ユーザー情報更新
    const { data, error } = await supabase
      .from('users')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return ApiResponse.internalError('ユーザー情報の更新に失敗しました');
    }

    if (!data) {
      return ApiResponse.notFound('ユーザーが見つかりません');
    }

    // メールアドレスが変更された場合、Auth側も更新
    if (validatedData.email) {
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(params.id, {
        email: validatedData.email,
      });

      if (updateAuthError) {
        // データベースをロールバック
        await supabase.from('users').update({ email: data.email }).eq('id', params.id);

        return ApiResponse.internalError('メールアドレスの更新に失敗しました');
      }
    }

    // レスポンス形式に変換
    const userResponse = UserResponseSchema.parse(data);

    return ApiResponse.success(userResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// DELETE /api/users/[id] - ユーザー削除（論理削除）
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();

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

    // 自分自身は削除できない
    if (params.id === user.id) {
      return ApiResponse.badRequest('自分自身を削除することはできません');
    }

    // 論理削除実行
    const { data, error } = await supabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error || !data) {
      return ApiResponse.notFound('ユーザーが見つかりません');
    }

    // Auth側のユーザーも無効化
    const { error: disableAuthError } = await supabase.auth.admin.updateUserById(
      params.id,
      { ban_duration: '876000h' } // 100年間のBAN（事実上の無効化）
    );

    if (disableAuthError) {
      console.error('Auth disable error:', disableAuthError);
      // ロールバック
      await supabase.from('users').update({ deleted_at: null }).eq('id', params.id);

      return ApiResponse.internalError('ユーザーの無効化に失敗しました');
    }

    return ApiResponse.success({ message: 'ユーザーを削除しました' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
