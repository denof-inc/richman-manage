import { NextRequest, NextResponse } from 'next/server';
import { getCache } from '@/lib/cache/redis-cache';
import { CacheKey } from '@/lib/cache/types';

/**
 * キャッシュミドルウェア設定
 */
interface CacheMiddlewareConfig {
  enabledPaths: string[];
  ttl: number;
  excludePaths?: string[];
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: CacheMiddlewareConfig = {
  enabledPaths: ['/api/properties', '/api/loans', '/api/users'],
  ttl: 300, // 5分
  excludePaths: ['/api/auth', '/api/health'],
};

/**
 * パスがキャッシュ対象かチェック
 */
function shouldCache(pathname: string, config: CacheMiddlewareConfig): boolean {
  // 除外パスをチェック
  if (config.excludePaths?.some((path) => pathname.startsWith(path))) {
    return false;
  }

  // 有効パスをチェック
  return config.enabledPaths.some((path) => pathname.startsWith(path));
}

/**
 * リクエストからユーザーIDを抽出
 */
async function extractUserId(request: NextRequest): Promise<string | null> {
  // Authorizationヘッダーからトークンを取得
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  // TODO: 実際の認証システムに合わせて実装
  // ここでは仮実装として、トークンからユーザーIDを抽出
  try {
    // JWTデコードなどの処理
    return null;
  } catch {
    return null;
  }
}

/**
 * キャッシュミドルウェア
 */
export function cacheMiddleware(config: CacheMiddlewareConfig = DEFAULT_CONFIG) {
  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // キャッシュ対象外のパスはスキップ
    if (!shouldCache(pathname, config)) {
      return NextResponse.next();
    }

    // GETリクエスト以外はスキップ
    if (request.method !== 'GET') {
      return NextResponse.next();
    }

    try {
      const cache = getCache();
      const userId = await extractUserId(request);

      // URLからリソース名とパラメータを抽出
      const resource = pathname.split('/').slice(2).join('/'); // /api/を除去
      const params: Record<string, string> = {};
      request.nextUrl.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // キャッシュキーを生成
      const cacheKey: CacheKey = {
        resource,
        userId,
        params: Object.keys(params).length > 0 ? params : undefined,
      };

      // キャッシュから取得を試行
      const cached = await cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': `private, max-age=${config.ttl}`,
          },
        });
      }
    } catch (error) {
      console.error('Cache middleware error:', error);
      // エラー時は通常のリクエスト処理を継続
    }

    return NextResponse.next();
  };
}

/**
 * キャッシュ統計エンドポイント用ミドルウェア
 */
export function cacheStatsMiddleware() {
  return async function middleware(request: NextRequest) {
    if (request.nextUrl.pathname === '/api/cache/stats') {
      // 管理者権限チェック
      const isAdmin = await checkAdminPermission(request);
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // キャッシュ統計を返す
      const stats = await getCacheStats();
      return NextResponse.json(stats);
    }

    return NextResponse.next();
  };
}

/**
 * 管理者権限チェック（仮実装）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkAdminPermission(request: NextRequest): Promise<boolean> {
  // TODO: 実際の権限チェックを実装
  return false;
}

/**
 * キャッシュ統計を取得（仮実装）
 */
async function getCacheStats() {
  return {
    hits: 0,
    misses: 0,
    hitRate: 0,
    lastReset: new Date(),
  };
}
