// next/server のモック
class NextRequest {
  constructor(url) {
    this.url = typeof url === 'string' ? new URL(url) : url;
    this.nextUrl = {
      ...this.url,
      pathname: this.url.pathname,
      clone: () => new URL(this.url.toString()),
    };
    this.cookies = {
      get: jest.fn((name) => undefined),
      set: jest.fn(),
      delete: jest.fn(),
    };
    this.headers = new Map();
  }
}

class NextResponse {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.headers = new Map();
    this.type = 'response';
  }

  static next() {
    return { type: 'next' };
  }

  static redirect(url) {
    return { type: 'redirect', url: url.toString() };
  }

  static rewrite(url) {
    return { type: 'rewrite', url: url.toString() };
  }
}

module.exports = {
  NextRequest,
  NextResponse,
};
