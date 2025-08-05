import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { UpdateExpenseSchema, ExpenseResponseSchema } from '@/lib/api/schemas/expense';
import { z } from 'zod';

// GET /api/expenses/[id] - 支出詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient();
    const { id: expenseId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 支出取得（物件の所有者チェック込み）
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('*, property:properties!inner(user_id)')
      .eq('id', expenseId)
      .eq('property.user_id', user.id)
      .single();

    if (error || !expense) {
      return ApiResponse.notFound('支出が見つかりません');
    }

    // レスポンス形式に変換（property情報を除外）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { property, ...expenseData } = expense;
    const expenseResponse = ExpenseResponseSchema.parse(expenseData);

    return ApiResponse.success(expenseResponse);
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// PUT /api/expenses/[id] - 支出更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient();
    const { id: expenseId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 既存支出の確認（物件の所有者チェック込み）
    const { data: existingExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*, property:properties!inner(user_id)')
      .eq('id', expenseId)
      .eq('property.user_id', user.id)
      .single();

    if (fetchError || !existingExpense) {
      return ApiResponse.notFound('支出が見つかりません');
    }

    // リクエストボディをパース
    const body = await request.json();
    const validatedData = UpdateExpenseSchema.parse(body);

    // 支出を更新
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return ApiResponse.internalError('支出の更新に失敗しました');
    }

    // レスポンス形式に変換
    const expenseResponse = ExpenseResponseSchema.parse(updatedExpense);

    return ApiResponse.success(expenseResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// DELETE /api/expenses/[id] - 支出削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const { id: expenseId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 既存支出の確認（物件の所有者チェック込み）
    const { data: existingExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*, property:properties!inner(user_id)')
      .eq('id', expenseId)
      .eq('property.user_id', user.id)
      .single();

    if (fetchError || !existingExpense) {
      return ApiResponse.notFound('支出が見つかりません');
    }

    // 論理削除
    const { error: deleteError } = await supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', expenseId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return ApiResponse.internalError('支出の削除に失敗しました');
    }

    return ApiResponse.success({ message: '支出を削除しました' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
