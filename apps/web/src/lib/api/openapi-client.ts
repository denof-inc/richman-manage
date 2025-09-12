// 薄い使用例: 生成クライアントのエクスポート
// 実運用では必要箇所で import して使用してください
// 生成クライアントの遅延読込（生成前でも型/ビルドを壊さないため）
export async function getApiClient(): Promise<unknown> {
  const dynamicPath = ['..', '..', '..', '..', 'packages', 'generated', 'client'].join('/');
  try {
    const mod = await import(dynamicPath);
    return mod;
  } catch {
    return null;
  }
}
