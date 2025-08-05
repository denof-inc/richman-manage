import { z } from 'zod';

/**
 * ページネーションパラメータのスキーマ
 */
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * ページネーションパラメータの型
 */
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * ページネーションメタデータ
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * ページネーション付きレスポンス
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * URLからページネーションパラメータを抽出
 */
export function extractPaginationParams(url: URL): PaginationParams {
  const params = {
    page: url.searchParams.get('page') || '1',
    limit: url.searchParams.get('limit') || '20',
    sort: url.searchParams.get('sort') || undefined,
    order: url.searchParams.get('order') || 'desc',
  };

  return PaginationParamsSchema.parse(params);
}

/**
 * ページネーションメタデータを計算
 */
export function calculatePaginationMeta(params: PaginationParams, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit);

  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

/**
 * Supabaseクエリにページネーションを適用
 */
export function applyPagination<T>(
  query: T & {
    range: (from: number, to: number) => T;
    order: (column: string, options?: { ascending?: boolean }) => T;
  },
  params: PaginationParams
): T {
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;

  // ソート適用
  if (params.sort) {
    query = query.order(params.sort, { ascending: params.order === 'asc' });
  }

  // 範囲適用
  return query.range(from, to);
}

/**
 * ページネーションリンクを生成
 */
export function generatePaginationLinks(
  baseUrl: string,
  meta: PaginationMeta
): {
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
} {
  const url = new URL(baseUrl);
  const links: ReturnType<typeof generatePaginationLinks> = {};

  // First page
  if (meta.page > 1) {
    url.searchParams.set('page', '1');
    links.first = url.toString();
  }

  // Previous page
  if (meta.hasPrev) {
    url.searchParams.set('page', (meta.page - 1).toString());
    links.prev = url.toString();
  }

  // Next page
  if (meta.hasNext) {
    url.searchParams.set('page', (meta.page + 1).toString());
    links.next = url.toString();
  }

  // Last page
  if (meta.page < meta.totalPages) {
    url.searchParams.set('page', meta.totalPages.toString());
    links.last = url.toString();
  }

  return links;
}

/**
 * カーソルベースページネーション用のヘルパー
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'next' | 'prev';
}

/**
 * カーソルをエンコード
 */
export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * カーソルをデコード
 */
export function decodeCursor(cursor: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  } catch {
    throw new Error('Invalid cursor');
  }
}

/**
 * エラーレスポンス用のヘルパー
 */
export function paginationValidationError(errors: z.ZodError): {
  code: string;
  message: string;
  details: unknown[];
} {
  return {
    code: 'INVALID_PAGINATION_PARAMS',
    message: 'Invalid pagination parameters',
    details: errors.errors,
  };
}
