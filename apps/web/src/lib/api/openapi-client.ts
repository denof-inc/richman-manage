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
type MinimalClient = { GET: (...args: unknown[]) => Promise<unknown> };

export async function fetchLoansListExample() {
  const client = await getApiClient();
  if (!client) return null;
  const { api } = client as { api: unknown };
  const typed = api as unknown as MinimalClient;
  const res = await typed.GET('/api/loans');
  return res;
}
