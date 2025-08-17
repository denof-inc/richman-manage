import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/middleware/performance-monitor';
// Edge Runtimeではioredis等のNode依存を読み込めないため、
// ミドルウェア段階のキャッシュ処理は無効化する（API側で行う）
import { rateLimiter } from '@/lib/security/rate-limiter';

// APIルートのパスパターン
const API_PATHS = ['/api/'];

// 認証不要なパス
const publicPaths = ['/login', '/signup', '/forgot-password'];

// 認証チェックをスキップするパス
const skipAuthPaths = ['/api/', '/_next/', '/favicon.ico'];

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

  // 認証チェック（APIルート以外）
  if (!skipAuthPaths.some((path) => pathname.startsWith(path))) {
    // Supabaseプロジェクト固有のクッキーパターンを確認
    const supabaseProjectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0];
    const projectCookieName = `sb-${supabaseProjectId}-auth-token`;

    // 複数のクッキーパターンを確認
    const projectToken = request.cookies.get(projectCookieName)?.value;
    const genericToken = request.cookies.get('sb-access-token')?.value;

    // 全てのSupabaseクッキーをスキャン（フォールバック）
    const allCookies = Array.from(request.cookies.getAll());
    const supabaseAuthCookie = allCookies.find(
      (cookie) => cookie.name.includes('-auth-token') && !cookie.name.includes('-code-verifier')
    );

    const token = projectToken || genericToken || supabaseAuthCookie?.value;

    // 認証不要ページの処理
    if (publicPaths.includes(pathname)) {
      // 認証済みユーザーがログイン関連ページにアクセスした場合はダッシュボードへ
      if (token) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    } else if (pathname !== '/') {
      // 認証が必要なページで未認証の場合はログインページへ
      if (!token) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }
    }
  }

  // APIルートの場合
  if (API_PATHS.some((path) => pathname.startsWith(path))) {
    // レート制限チェック
    const clientIP =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    if (!rateLimiter.isAllowed(clientIP)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '3600', // 1時間後に再試行
          'X-RateLimit-Remaining': '0',
        },
      });
    }

    // パフォーマンスモニタリングを適用
    const monitoringConfig = {
      enabled: process.env.ENABLE_MONITORING === 'true',
      slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000'),
      logSlowRequests: true,
      collectMemoryMetrics: true,
      collectCpuMetrics: process.platform !== 'win32',
    };

    // キャッシュはAPIルート内（Node Runtime）でのみ実施する

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

    // レート制限ヘッダーを追加
    response.headers.set(
      'X-RateLimit-Remaining',
      rateLimiter.getRemainingRequests(clientIP).toString()
    );

    // キャッシュはEdgeミドルウェアでは実施しない

    return response;
  }

  // その他のルートはそのまま通す
  return NextResponse.next();
}
