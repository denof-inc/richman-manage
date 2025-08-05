import { Redis } from 'ioredis';
import { CacheConfig, CacheKey, CacheOptions } from './types';

/**
 * Redisベースのキャッシュシステム
 * TTLベースのキャッシュ戦略を実装
 */
export class ApiCache {
  private redis: Redis;
  private config: CacheConfig;
  private defaultTTL: number = 300; // 5分

  constructor(config: CacheConfig) {
    this.config = config;
    this.redis = new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      db: config.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // エラーハンドリング
    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  /**
   * キャッシュキーの生成
   */
  private generateKey(key: CacheKey): string {
    const { resource, userId, params } = key;
    let cacheKey = `api:${resource}`;

    if (userId) {
      cacheKey += `:user:${userId}`;
    }

    if (params) {
      const sortedParams = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join(':');
      cacheKey += `:${sortedParams}`;
    }

    return cacheKey;
  }

  /**
   * キャッシュから値を取得
   */
  async get<T>(key: CacheKey): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key);
      const value = await this.redis.get(cacheKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * キャッシュに値を設定
   */
  async set<T>(key: CacheKey, value: T, options?: CacheOptions): Promise<void> {
    try {
      const cacheKey = this.generateKey(key);
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.redis.setex(cacheKey, ttl, serialized);
      } else {
        await this.redis.set(cacheKey, serialized);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * キャッシュから値を削除
   */
  async delete(key: CacheKey): Promise<void> {
    try {
      const cacheKey = this.generateKey(key);
      await this.redis.del(cacheKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * パターンに一致するキャッシュをクリア
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`api:${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  /**
   * ユーザー関連のキャッシュをクリア
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.invalidatePattern(`*:user:${userId}`);
  }

  /**
   * リソース関連のキャッシュをクリア
   */
  async invalidateResource(resource: string, userId?: string): Promise<void> {
    if (userId) {
      await this.invalidatePattern(`${resource}:user:${userId}`);
    } else {
      await this.invalidatePattern(resource);
    }
  }

  /**
   * 接続を閉じる
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

// シングルトンインスタンス
let cacheInstance: ApiCache | null = null;

/**
 * キャッシュインスタンスを取得
 */
export function getCache(): ApiCache {
  if (!cacheInstance) {
    const config: CacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    };
    cacheInstance = new ApiCache(config);
  }
  return cacheInstance;
}

/**
 * キャッシュデコレーター
 * APIルートハンドラーに適用してキャッシュを有効化
 */
export function withCache<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  options: {
    resource: string;
    ttl?: number;
    getUserId?: (request: Request) => Promise<string | null>;
  }
): T {
  return (async (...args: unknown[]) => {
    const [request] = args as [Request];
    const cache = getCache();

    // ユーザーIDを取得
    const userId = options.getUserId ? await options.getUserId(request) : null;

    // URLからパラメータを抽出
    const url = new URL(request.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // キャッシュキーを生成
    const cacheKey: CacheKey = {
      resource: options.resource,
      userId,
      params: Object.keys(params).length > 0 ? params : undefined,
    };

    // GETリクエストのみキャッシュを確認
    if (request.method === 'GET') {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          },
        });
      }
    }

    // ハンドラーを実行
    const response = await handler(...args);

    // 成功レスポンスをキャッシュ
    if (request.method === 'GET' && response.status === 200) {
      const data = await response.clone().json();
      await cache.set(cacheKey, data, { ttl: options.ttl });

      // キャッシュミスヘッダーを追加
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        },
      });
    }

    // 更新・削除操作の場合はキャッシュを無効化
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await cache.invalidateResource(options.resource, userId || undefined);
    }

    return response;
  }) as T;
}
