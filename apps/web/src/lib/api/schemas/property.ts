import { z } from 'zod';

// 物件タイプの定義
export const PropertyTypeSchema = z.enum([
  'apartment',
  'office',
  'house',
  'land',
  'commercial',
  'industrial',
  'mixed_use',
  'other',
]);

// 物件作成用スキーマ
export const CreatePropertySchema = z.object({
  name: z.string().min(1, '物件名は必須です').max(100, '物件名は100文字以内で入力してください'),
  address: z.string().min(1, '住所は必須です').max(200, '住所は200文字以内で入力してください'),
  property_type: PropertyTypeSchema,
  purchase_price: z.number().positive('購入価格は正の数値である必要があります'),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください'),
  current_valuation: z.number().positive('現在評価額は正の数値である必要があります').optional(),
});

// 物件更新用スキーマ
export const UpdatePropertySchema = z.object({
  name: z
    .string()
    .min(1, '物件名は必須です')
    .max(100, '物件名は100文字以内で入力してください')
    .optional(),
  address: z
    .string()
    .min(1, '住所は必須です')
    .max(200, '住所は200文字以内で入力してください')
    .optional(),
  property_type: PropertyTypeSchema.optional(),
  purchase_price: z.number().positive('購入価格は正の数値である必要があります').optional(),
  purchase_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください')
    .optional(),
  current_valuation: z
    .number()
    .positive('現在評価額は正の数値である必要があります')
    .nullable()
    .optional(),
});

// 物件レスポンススキーマ
export const PropertyResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  property_type: PropertyTypeSchema,
  purchase_price: z.number(),
  purchase_date: z.string(),
  current_valuation: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

// 物件一覧クエリパラメータスキーマ
export const PropertyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  property_type: PropertyTypeSchema.optional(),
  search: z.string().optional(),
  sort: z
    .enum(['created_at', 'updated_at', 'name', 'purchase_date', 'purchase_price'])
    .default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// 型エクスポート
export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;
export type PropertyResponse = z.infer<typeof PropertyResponseSchema>;
export type PropertyQuery = z.infer<typeof PropertyQuerySchema>;
export type PropertyType = z.infer<typeof PropertyTypeSchema>;
