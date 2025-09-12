export function createDocument<T extends Record<string, any>>(doc: T): T {
  // Jest専用の軽量モック: Zod変換は行わず、そのまま返す
  return doc;
}
