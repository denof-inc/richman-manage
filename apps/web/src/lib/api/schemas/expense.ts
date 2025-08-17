import { z } from 'zod';

/**
 * 支出カテゴリー
 */
export const ExpenseCategorySchema = z.enum([
  'management_fee',
  'repair_cost',
  'utility',
  'insurance',
  'tax',
  'other',
]);

/**
 * 支出作成用スキーマ
 */
export const CreateExpenseSchema = z.object({
  property_id: z.string().uuid('有効な物件IDを指定してください'),
  expense_date: z.string().datetime('有効な日付を指定してください'),
  category: ExpenseCategorySchema,
  amount: z.number().min(0, '金額は0円以上で入力してください'),
  vendor: z.string().min(1, '支払先を入力してください').nullable().optional(),
  description: z.string().nullable().optional(),
  receipt_url: z.string().url('有効なURLを指定してください').nullable().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(['monthly', 'quarterly', 'annually']).nullable().optional(),
});

/**
 * 支出更新用スキーマ
 */
export const UpdateExpenseSchema = CreateExpenseSchema.partial();

/**
 * 支出検索クエリスキーマ
 */
export const ExpenseQuerySchema = z.object({
  property_id: z.string().uuid().optional(),
  category: ExpenseCategorySchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  min_amount: z.coerce.number().min(0).optional(),
  max_amount: z.coerce.number().min(0).optional(),
  is_recurring: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

/**
 * 支出レスポンススキーマ
 */
export const ExpenseResponseSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  expense_date: z.string(),
  category: ExpenseCategorySchema,
  amount: z.number(),
  vendor: z.string().nullable(),
  description: z.string().nullable(),
  receipt_url: z.string().nullable(),
  is_recurring: z.boolean(),
  recurring_frequency: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

/**
 * 型定義
 */
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
export type CreateExpense = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>;
export type ExpenseQuery = z.infer<typeof ExpenseQuerySchema>;
export type ExpenseResponse = z.infer<typeof ExpenseResponseSchema>;
