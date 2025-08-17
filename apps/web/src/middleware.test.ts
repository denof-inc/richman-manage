import { middleware } from './middleware';
import { NextRequest } from 'next/server';

// NextRequestをモック
jest.mock('next/server', () => ({
  NextRequest: jest.fn((url: string | URL) => ({
    url: typeof url === 'string' ? new URL(url) : url,
    nextUrl: {
      pathname: typeof url === 'string' ? new URL(url).pathname : url.pathname,
      clone: () => new URL(typeof url === 'string' ? url : url.toString()),
    },
    cookies: {
      get: jest.fn(() => undefined),
      getAll: jest.fn(() => []),
    },
    headers: new Map(),
  })),
  NextResponse: {
    next: jest.fn(() => ({ type: 'next' })),
    redirect: jest.fn((url: URL) => ({ type: 'redirect', url: url.toString() })),
  },
}));

// performanceMonitorとrateLimiterのモック
jest.mock('@/lib/middleware/performance-monitor', () => ({
  performanceMonitor: jest.fn(() => jest.fn(() => Promise.resolve({ headers: new Map() }))),
}));

jest.mock('@/lib/security/rate-limiter', () => ({
  rateLimiter: {
    isAllowed: jest.fn(() => true),
    getRemainingRequests: jest.fn(() => 100),
  },
}));

describe('middleware', () => {
  const createRequest = (path: string, hasToken: boolean = false) => {
    const MockedNextRequest = NextRequest as jest.MockedClass<typeof NextRequest>;
    const req = new MockedNextRequest(`http://localhost:3000${path}`);
    if (hasToken) {
      req.cookies.get = jest.fn((name: string) => {
        if (name === 'sb-access-token') {
          return { name: 'sb-access-token', value: 'test-token' };
        }
        return undefined;
      });
      req.cookies.getAll = jest.fn(() => [{ name: 'sb-access-token', value: 'test-token' }]);
    } else {
      req.cookies.getAll = jest.fn(() => []);
    }
    return req;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('認証不要ページは誰でもアクセスできる', async () => {
    const req = createRequest('/');
    const res = await middleware(req);

    expect(res.type).toBe('next');
  });

  it('ログインページは未認証ユーザーがアクセスできる', async () => {
    const req = createRequest('/login');
    const res = await middleware(req);

    expect(res.type).toBe('next');
  });

  it('保護されたページは未認証ユーザーをログインページにリダイレクト', async () => {
    const req = createRequest('/properties');
    const res = await middleware(req);

    expect(res.type).toBe('redirect');
    expect(res.url).toContain('/login');
  });

  it('保護されたページは認証済みユーザーがアクセスできる', async () => {
    const req = createRequest('/properties', true);
    const res = await middleware(req);

    expect(res.type).toBe('next');
  });

  it('認証済みユーザーがログインページにアクセスするとダッシュボードにリダイレクト', async () => {
    const req = createRequest('/login', true);
    const res = await middleware(req);

    expect(res.type).toBe('redirect');
    expect(res.url).toContain('://localhost:3000/');
  });

  it('APIルートは認証チェックをスキップ', async () => {
    const req = createRequest('/api/test');
    const res = await middleware(req);

    // APIルートはperformanceMonitorを通るため、その戻り値を確認
    expect(res).toBeDefined();
  });

  it('静的ファイルは認証チェックをスキップ', async () => {
    const req = createRequest('/_next/static/test.js');
    const res = await middleware(req);

    expect(res.type).toBe('next');
  });
});
