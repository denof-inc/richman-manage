import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/middleware/performance-monitor';
import { cacheMiddleware } from '@/lib/middleware/cache-middleware';

// APIルートのパスパターン
const API_PATHS = ['/api/'];

/**
 * ミドルウェア設定
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

/**
 * メインミドルウェア
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // APIルートの場合
  if (API_PATHS.some((path) => pathname.startsWith(path))) {
    // パフォーマンスモニタリングを適用
    const monitoringConfig = {
      enabled: process.env.ENABLE_MONITORING === 'true',
      slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000'),
      logSlowRequests: true,
      collectMemoryMetrics: true,
      collectCpuMetrics: process.platform !== 'win32',
    };

    // キャッシュミドルウェアを適用
    const cacheConfig = {
      enabledPaths: ['/api/properties', '/api/loans', '/api/users'],
      ttl: parseInt(process.env.CACHE_TTL || '300'),
      excludePaths: ['/api/auth', '/api/health'],
    };

    // イベントオブジェクトを作成
    const event = {
      waitUntil: (promise: Promise<unknown>) => {
        // Next.jsではwaitUntilは自動的に処理される
        promise.catch(console.error);
      },
    };

    // パフォーマンスモニタリングを実行
    const performanceMiddleware = performanceMonitor(monitoringConfig);
    const response = await performanceMiddleware(request, event);

    // キャッシュミドルウェアを実行（GETリクエストのみ）
    if (request.method === 'GET' && process.env.ENABLE_CACHE === 'true') {
      const cacheMiddlewareHandler = cacheMiddleware(cacheConfig);
      const cachedResponse = await cacheMiddlewareHandler(request);

      // キャッシュヒットの場合はそのレスポンスを返す
      if (cachedResponse.headers.get('X-Cache') === 'HIT') {
        return cachedResponse;
      }
    }

    return response;
  }

  // その他のルートはそのまま通す
  return NextResponse.next();
}
