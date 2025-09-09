import { z } from 'zod';

// 借入タイプの定義
export const LoanTypeSchema = z.enum(['mortgage', 'business', 'personal', 'other']);

// 借入作成用スキーマ
export const CreateLoanSchema = z.object({
  property_id: z.string().uuid('物件IDが無効です').optional(),
  owner_id: z.string().uuid('所有者IDが無効です').optional(),
  lender_name: z
    .string()
    .min(1, '金融機関名は必須です')
    .max(100, '金融機関名は100文字以内で入力してください'),
  branch_name: z.string().max(100, '支店名は100文字以内で入力してください').optional(),
  loan_type: LoanTypeSchema,
  principal_amount: z.number().positive('借入元本は正の数値である必要があります'),
  current_balance: z.number().min(0, '現在残高は0以上である必要があります'),
  interest_rate: z
    .number()
    .min(0, '金利は0以上である必要があります')
    .max(100, '金利は100%以下である必要があります'),
  loan_term_months: z.number().int().positive('借入期間は正の整数である必要があります'),
  monthly_payment: z.number().positive('月返済額は正の数値である必要があります'),
  notes: z.string().max(2000, 'メモは2000文字以内で入力してください').optional(),
});

// 借入更新用スキーマ
export const UpdateLoanSchema = z.object({
  lender_name: z
    .string()
    .min(1, '金融機関名は必須です')
    .max(100, '金融機関名は100文字以内で入力してください')
    .optional(),
  branch_name: z.string().max(100).optional(),
  loan_type: LoanTypeSchema.optional(),
  owner_id: z.string().uuid().optional(),
  current_balance: z.number().min(0, '現在残高は0以上である必要があります').optional(),
  interest_rate: z
    .number()
    .min(0, '金利は0以上である必要があります')
    .max(100, '金利は100%以下である必要があります')
    .optional(),
  monthly_payment: z.number().positive('月返済額は正の数値である必要があります').optional(),
  notes: z.string().max(2000).optional(),
});

// 借入レスポンススキーマ
export const LoanResponseSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid().nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  lender_name: z.string(),
  branch_name: z.string().nullable().optional(),
  loan_type: LoanTypeSchema,
  principal_amount: z.number(),
  current_balance: z.number(),
  interest_rate: z.number(),
  loan_term_months: z.number(),
  monthly_payment: z.number(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

// 借入一覧クエリパラメータスキーマ
export const LoanQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  property_id: z.string().uuid().optional(),
  owner_id: z.string().uuid().optional(),
  loan_type: LoanTypeSchema.optional(),
  search: z.string().optional(),
  sort: z
    .enum(['created_at', 'updated_at', 'lender_name', 'current_balance', 'interest_rate'])
    .default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// 型エクスポート
export type CreateLoanInput = z.infer<typeof CreateLoanSchema>;
export type UpdateLoanInput = z.infer<typeof UpdateLoanSchema>;
export type LoanResponse = z.infer<typeof LoanResponseSchema>;
export type LoanQuery = z.infer<typeof LoanQuerySchema>;
export type LoanType = z.infer<typeof LoanTypeSchema>;
