import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { UpdateExpenseSchema, ExpenseResponseSchema } from '@/lib/api/schemas/expense';
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

// GET /api/expenses/[id] - 支出詳細取得
/**
 * @swagger
 * /api/expenses/{id}:
 *   get:
 *     tags: [Expenses]
 *     summary: 支出の詳細を取得
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 成功
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPerformanceMonitoring(async () => {
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
      const { data: expense, error } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('expenses')
            .select('*, property:properties!inner(user_id)')
            .eq('id', expenseId)
            .eq('property.user_id', user.id)
            .single(),
        'expenses.database.getById'
      );

      if (error || !expense) {
        return ApiResponse.notFound('支出が見つかりません');
      }

      // レスポンス形式に変換（property情報を除外）
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { property, ...expenseData } = expense;
      const expenseResponse = ExpenseResponseSchema.parse(expenseData);

      return ApiResponse.success(expenseResponse);
    } catch (error) {
      return handleApiError(error, `GET /api/expenses/${await params.then((p) => p.id)}`);
    }
  }, 'GET /api/expenses/[id]');
}

// PUT /api/expenses/[id] - 支出更新
/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     tags: [Expenses]
 *     summary: 支出を更新
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateExpense'
 *     responses:
 *       200:
 *         description: 更新成功
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPerformanceMonitoring(async () => {
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
      const { data: existingExpense, error: fetchError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('expenses')
            .select('*, property:properties!inner(user_id)')
            .eq('id', expenseId)
            .eq('property.user_id', user.id)
            .single(),
        'expenses.database.checkExisting'
      );

      if (fetchError || !existingExpense) {
        return ApiResponse.notFound('支出が見つかりません');
      }

      // リクエストボディをパース
      const body = await request.json();
      const validatedData = UpdateExpenseSchema.parse(body);

      // 支出を更新
      const { data: updatedExpense, error: updateError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('expenses')
            .update({
              ...validatedData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', expenseId)
            .select()
            .single(),
        'expenses.database.update'
      );

      if (updateError) {
        throw updateError;
      }

      // レスポンス形式に変換
      const expenseResponse = ExpenseResponseSchema.parse(updatedExpense);

      return ApiResponse.success(expenseResponse);
    } catch (error) {
      return handleApiError(error, `PUT /api/expenses/${await params.then((p) => p.id)}`);
    }
  }, 'PUT /api/expenses/[id]');
}

// DELETE /api/expenses/[id] - 支出削除（論理削除）
/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: 支出を削除（論理削除）
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 削除成功
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPerformanceMonitoring(async () => {
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
      const { data: existingExpense, error: fetchError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('expenses')
            .select('*, property:properties!inner(user_id)')
            .eq('id', expenseId)
            .eq('property.user_id', user.id)
            .single(),
        'expenses.database.checkExisting'
      );

      if (fetchError || !existingExpense) {
        return ApiResponse.notFound('支出が見つかりません');
      }

      // 論理削除
      const { error: deleteError } = await withPerformanceMonitoring(
        async () =>
          await supabase
            .from('expenses')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', expenseId),
        'expenses.database.delete'
      );

      if (deleteError) {
        throw deleteError;
      }

      return ApiResponse.success({ message: '支出を削除しました' });
    } catch (error) {
      return handleApiError(error, `DELETE /api/expenses/${await params.then((p) => p.id)}`);
    }
  }, 'DELETE /api/expenses/[id]');
}
