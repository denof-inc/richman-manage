import { z } from 'zod';

// Envelope schemas following ApiResponse contract
const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

const makeSuccessEnvelope = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    error: z.null(),
    meta: z.unknown().optional(),
  });

const errorEnvelope = z.object({
  success: z.literal(false),
  data: z.null(),
  error: errorSchema,
});

export type ApiClientOptions = {
  init?: RequestInit;
};

export type ApiResult<T> = { data: T; meta?: unknown };

async function parseJson(response: Response) {
  const text = await response.text();
  // handle empty body
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response');
  }
}

export async function request<T>(
  path: string,
  dataSchema: z.ZodTypeAny,
  options: ApiClientOptions = {}
): Promise<ApiResult<T>> {
  const res = await fetch(path, { credentials: 'same-origin', ...options.init });
  const json = await parseJson(res);

  // Try success envelope first
  const Success = makeSuccessEnvelope(dataSchema);
  const success = Success.safeParse(json);
  if (success.success) {
    return { data: success.data.data as T, meta: success.data.meta };
  }

  // Then error envelope
  const err = errorEnvelope.safeParse(json);
  if (err.success) {
    const { code, message, details } = err.data.error;
    const error = new Error(`${code}: ${message}`) as Error & { details?: unknown };
    error.details = details;
    throw error;
  }

  // Fallback: if server returned non-enveloped data but status OK, try raw schema
  if (res.ok) {
    const raw = dataSchema.safeParse(json);
    if (raw.success) {
      return { data: raw.data as T };
    }
  }

  throw new Error(`Unexpected API response for ${path}`);
}
