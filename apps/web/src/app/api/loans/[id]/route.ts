import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { UpdateLoanSchema, LoanResponseSchema } from '@/lib/api/schemas/loan';
import { z } from 'zod';

// パフォーマンス監視ユーティリティ（Edge Runtime対応）
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
    return ApiResponse.badRequest(sanitizeErrorMessage(supabaseError.message));
  }

  return ApiResponse.internalError('予期しないエラーが発生しました');
};

// GET /api/loans/[id] - 借入詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPerformanceMonitoring(async () => {
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

      // 借入取得（物件の所有者チェック込み）
      const { data: loan, error } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('loans')
            .select('*, property:properties!inner(user_id)')
            .eq('id', loanId)
            .eq('property.user_id', user.id)
            .single(),
        'loans.database.getById'
      );

      if (error || !loan) {
        return ApiResponse.notFound('借入が見つかりません');
      }

      // レスポンス形式に変換（property情報を除外・スキーマ互換）
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { property, initial_interest_rate, loan_type, ...rest } = loan as Record<
        string,
        unknown
      >;
      const mapped = {
        ...rest,
        interest_rate: initial_interest_rate ?? rest.interest_rate ?? 0,
        loan_type: loan_type === 'property_acquisition' ? 'mortgage' : 'other',
      };
      const loanResponse = LoanResponseSchema.parse(mapped);

      return ApiResponse.success(loanResponse);
    } catch (error) {
      return handleApiError(error, `GET /api/loans/${await params.then((p) => p.id)}`);
    }
  }, 'GET /api/loans/[id]');
}

// PUT /api/loans/[id] - 借入更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPerformanceMonitoring(async () => {
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

      // 既存借入の確認（物件の所有者チェック込み）
      const { data: existingLoan, error: fetchError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('loans')
            .select('*, property:properties!inner(user_id)')
            .eq('id', loanId)
            .eq('property.user_id', user.id)
            .single(),
        'loans.database.checkExisting'
      );

      if (fetchError || !existingLoan) {
        return ApiResponse.notFound('借入が見つかりません');
      }

      // リクエストボディをパース
      const body = await request.json();
      const validatedData = UpdateLoanSchema.parse(body);

      // 借入を更新
      const { data: updatedLoan, error: updateError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('loans')
            .update({
              ...validatedData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', loanId)
            .select()
            .single(),
        'loans.database.update'
      );

      if (updateError) {
        throw updateError;
      }

      // レスポンス形式に変換
      const loanResponse = LoanResponseSchema.parse(updatedLoan);

      return ApiResponse.success(loanResponse);
    } catch (error) {
      return handleApiError(error, `PUT /api/loans/${await params.then((p) => p.id)}`);
    }
  }, 'PUT /api/loans/[id]');
}

// DELETE /api/loans/[id] - 借入削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPerformanceMonitoring(async () => {
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

      // 既存借入の確認（物件の所有者チェック込み）
      const { data: existingLoan, error: fetchError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('loans')
            .select('*, property:properties!inner(user_id)')
            .eq('id', loanId)
            .eq('property.user_id', user.id)
            .single(),
        'loans.database.checkExisting'
      );

      if (fetchError || !existingLoan) {
        return ApiResponse.notFound('借入が見つかりません');
      }

      // 論理削除
      const { error: deleteError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('loans')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', loanId),
        'loans.database.delete'
      );

      if (deleteError) {
        throw deleteError;
      }

      return ApiResponse.success({ message: '借入を削除しました' });
    } catch (error) {
      return handleApiError(error, `DELETE /api/loans/${await params.then((p) => p.id)}`);
    }
  }, 'DELETE /api/loans/[id]');
}
