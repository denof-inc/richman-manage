import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { UpdateLoanSchema, LoanResponseSchema } from '@/lib/api/schemas/loan';
import { z } from 'zod';

interface RouteContext {
  params: {
    id: string;
  };
}

// GET /api/loans/[id] - 借入詳細取得
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createClient();
    const loanId = context.params.id;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 借入取得（物件の所有者チェック込み）
    const { data: loan, error } = await supabase
      .from('loans')
      .select('*, property:properties!inner(user_id)')
      .eq('id', loanId)
      .eq('property.user_id', user.id)
      .single();

    if (error || !loan) {
      return ApiResponse.notFound('借入が見つかりません');
    }

    // レスポンス形式に変換（property情報を除外）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { property, ...loanData } = loan;
    const loanResponse = LoanResponseSchema.parse(loanData);

    return ApiResponse.success(loanResponse);
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// PUT /api/loans/[id] - 借入更新
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createClient();
    const loanId = context.params.id;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 既存借入の確認（物件の所有者チェック込み）
    const { data: existingLoan, error: fetchError } = await supabase
      .from('loans')
      .select('*, property:properties!inner(user_id)')
      .eq('id', loanId)
      .eq('property.user_id', user.id)
      .single();

    if (fetchError || !existingLoan) {
      return ApiResponse.notFound('借入が見つかりません');
    }

    // リクエストボディをパース
    const body = await request.json();
    const validatedData = UpdateLoanSchema.parse(body);

    // 借入を更新
    const { data: updatedLoan, error: updateError } = await supabase
      .from('loans')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return ApiResponse.internalError('借入の更新に失敗しました');
    }

    // レスポンス形式に変換
    const loanResponse = LoanResponseSchema.parse(updatedLoan);

    return ApiResponse.success(loanResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      return ApiResponse.validationError(messages, error.errors);
    }
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}

// DELETE /api/loans/[id] - 借入削除（論理削除）
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = createClient();
    const loanId = context.params.id;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 既存借入の確認（物件の所有者チェック込み）
    const { data: existingLoan, error: fetchError } = await supabase
      .from('loans')
      .select('*, property:properties!inner(user_id)')
      .eq('id', loanId)
      .eq('property.user_id', user.id)
      .single();

    if (fetchError || !existingLoan) {
      return ApiResponse.notFound('借入が見つかりません');
    }

    // 論理削除
    const { error: deleteError } = await supabase
      .from('loans')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', loanId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return ApiResponse.internalError('借入の削除に失敗しました');
    }

    return ApiResponse.success({ message: '借入を削除しました' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return ApiResponse.internalError('予期しないエラーが発生しました');
  }
}
