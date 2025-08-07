/**
 * キャッシュシステムの型定義
 */

/**
 * キャッシュ設定
 */
export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

/**
 * キャッシュキー
 */
export interface CacheKey {
  resource: string;
  userId?: string | null;
  params?: Record<string, string>;
}

/**
 * キャッシュオプション
 */
export interface CacheOptions {
  ttl?: number; // Time To Live (秒)
}

/**
 * キャッシュ統計
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  lastReset: Date;
}
