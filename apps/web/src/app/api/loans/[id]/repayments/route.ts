import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { z } from 'zod';
import { LoanRepaymentResponseSchema } from '@/lib/api/schemas/loan-repayment';

const sanitizeErrorMessage = (message: string): string =>
  message
    .replace(/password[=:][\S]+/gi, 'password=***')
    .replace(/token[=:][\S]+/gi, 'token=***')
    .replace(/secret[=:][\S]+/gi, 'secret=***')
    .replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***@')
    .replace(/mysql:\/\/[^@]+@/gi, 'mysql://***@')
    .replace(/mongodb:\/\/[^@]+@/gi, 'mongodb://***@');

const handleApiError = (error: unknown, context: string) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? sanitizeErrorMessage(error.message) : 'Unknown error',
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
    return ApiResponse.badRequest(sanitizeErrorMessage(supabaseError.message));
  }

  return ApiResponse.internalError('予期しないエラーが発生しました');
};

// GET /api/loans/[id]/repayments - 指定借入の返済履歴一覧
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient();
    const { id: loanId } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return ApiResponse.unauthorized();
    }

    // 対象ローンがユーザーに属するか確認（properties経由）
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, property:properties!inner(user_id)')
      .eq('id', loanId)
      .eq('property.user_id', user.id)
      .single();

    if (loanError || !loan) {
      return ApiResponse.notFound('借入が見つかりません');
    }

    // 返済履歴の取得
    const { data, error } = await supabase
      .from('loan_repayments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false });

    if (error) {
      throw error;
    }

    const repayments = (data ?? []).map((r) => LoanRepaymentResponseSchema.parse(r));
    return ApiResponse.success(repayments);
  } catch (error) {
    return handleApiError(error, 'GET /api/loans/[id]/repayments');
  }
}
