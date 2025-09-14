// 薄い使用例: 生成クライアントのエクスポート
// 実運用では必要箇所で import して使用してください
// 生成クライアントの遅延読込（生成前でも型/ビルドを壊さないため）
export async function getApiClient(): Promise<{ api: unknown } | null> {
  const dynamicPath = ['..', '..', '..', '..', 'packages', 'generated', 'client'].join('/');
  try {
    const mod = (await import(dynamicPath)) as { api: unknown };
    return mod;
  } catch {
    return null;
  }
}

// 簡易な使用例（呼び出し側でnullチェック必須）
type UnknownSdkClient = { GET: (path: string, options?: unknown) => Promise<{ data: unknown }> };

export async function fetchLoansListExample() {
  const client = await getApiClient();
  if (!client) return null;
  const { api } = client as { api: unknown };
  const typed = api as unknown as UnknownSdkClient;
  const res = await typed.GET('/api/loans');
  return res;
}

// 実運用向け: SDKで取得→エンベロープを解釈して配列を返す
import { z } from 'zod';
import { LoanResponseSchema } from '@/lib/api/schemas/loan';

const LoanListEnvelope = z.object({
  success: z.literal(true),
  data: z.array(LoanResponseSchema),
  error: z.null(),
  meta: z.unknown().optional(),
});

export async function getLoansViaSdk(params?: { property_id?: string }, signal?: AbortSignal) {
  const client = await getApiClient();
  if (!client) throw new Error('SDK is not available (generate types/client first)');
  const { api } = client as { api: unknown };
  const typed = api as unknown as UnknownSdkClient;
  const res = await typed.GET('/api/loans', {
    params: params ? { query: params } : undefined,
    signal,
  });
  const parsed = LoanListEnvelope.safeParse(res.data);
  if (!parsed.success) throw new Error('Unexpected API response (envelope parse failed)');
  return { data: parsed.data.data, meta: parsed.data.meta } as const;
}
