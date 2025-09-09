import { z } from 'zod';

export const OwnerKindSchema = z.enum(['individual', 'corporation']);

export const CreateOwnerSchema = z.object({
  name: z.string().min(1, '所有者名は必須です').max(100, '所有者名は100文字以内で入力してください'),
  owner_kind: OwnerKindSchema.default('individual'),
});

export const OwnerResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  owner_kind: OwnerKindSchema,
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

export type OwnerKind = z.infer<typeof OwnerKindSchema>;
export type CreateOwnerInput = z.infer<typeof CreateOwnerSchema>;
export type OwnerResponse = z.infer<typeof OwnerResponseSchema>;
