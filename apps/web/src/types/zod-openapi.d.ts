declare module 'zod-openapi' {
  // 最小型定義（テスト専用）
  export function createDocument<T extends Record<string, unknown>>(doc: T): T;
}
