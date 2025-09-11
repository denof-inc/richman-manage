import { z } from 'zod';

export const ApiMetaSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  totalPages: z.number().int().positive().optional(),
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  data: z.null(),
  error: ApiErrorSchema,
});
