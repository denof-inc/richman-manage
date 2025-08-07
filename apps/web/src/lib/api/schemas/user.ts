import { z } from 'zod';

// ユーザーロールの定義
export const UserRoleSchema = z.enum(['admin', 'owner', 'manager', 'viewer', 'auditor']);

// ユーザー作成用スキーマ
export const CreateUserSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  role: UserRoleSchema.default('viewer'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります')
    .regex(/[a-z]/, 'パスワードには小文字を含める必要があります')
    .regex(/[0-9]/, 'パスワードには数字を含める必要があります'),
});

// ユーザー更新用スキーマ
export const UpdateUserSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください').optional(),
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内で入力してください')
    .optional(),
  role: UserRoleSchema.optional(),
  timezone: z.string().optional(),
  language: z.enum(['ja', 'en']).optional(),
});

// ユーザーレスポンススキーマ（パスワードを除外）
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  timezone: z.string(),
  language: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ユーザー一覧クエリパラメータスキーマ
export const UserQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  role: UserRoleSchema.optional(),
  search: z.string().optional(),
  sort: z.enum(['created_at', 'updated_at', 'name', 'email']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// 型エクスポート
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
