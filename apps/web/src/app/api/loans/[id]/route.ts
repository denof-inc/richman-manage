import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { UpdateLoanSchema, LoanResponseSchema } from '@/lib/api/schemas/loan';
import { mapLoanDbToDto } from '@/lib/mappers/loans';
import { mapLoanDtoToDbForUpdate } from '@/lib/mappers/loans';
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

const hasSupabaseCode = (e: unknown): e is { code: string; message: string } =>
  typeof e === 'object' && e !== null && 'code' in (e as Record<string, unknown>);

// 統一エラーハンドリング（Edge Runtime対応）
const handleApiError = (error: unknown, context: string) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? error.message : 'Unknown error',
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
            .select('*, property:properties!left(user_id), owner:owners!left(user_id)')
            .eq('id', loanId)
            .or(`property.user_id.eq.${user.id},owner.user_id.eq.${user.id}`)
            .single(),
        'loans.database.getById'
      );

      if (error || !loan) {
        return ApiResponse.notFound('借入が見つかりません');
      }

      // レスポンス形式に変換（property情報を除外）+ DB→DTO正規化
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { property, owner, ...loanData } = loan as Record<string, unknown>;
      const normalized = mapLoanDbToDto(loanData);
      const loanResponse = LoanResponseSchema.parse(normalized);

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
      let body;
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const validatedData = UpdateLoanSchema.parse(body);

      // DTO→DB 変換（軽量適用）。既存スキーマ互換の安全キーのみ送信。
      const mapped = mapLoanDtoToDbForUpdate(validatedData);
      const safeUpdate = {
        lender_name: mapped.lender_name,
        loan_type: mapped.loan_type,
        current_balance: mapped.current_balance,
        interest_rate: mapped.interest_rate, // 既存スキーマ互換
        monthly_payment: mapped.monthly_payment,
        updated_at: mapped.updated_at,
      };

      // 借入を更新
      const { data: updatedLoan, error: updateError } = await withPerformanceMonitoring(
        async () =>
          await supabase.from('loans').update(safeUpdate).eq('id', loanId).select().single(),
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
