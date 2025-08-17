// next/server のモック
class NextRequest {
  constructor(url, options = {}) {
    // URLを適切にパース
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    this.url = urlObj;

    // nextUrlオブジェクトを正しく設定
    this.nextUrl = {
      href: urlObj.href,
      origin: urlObj.origin,
      protocol: urlObj.protocol,
      host: urlObj.host,
      hostname: urlObj.hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      search: urlObj.search,
      searchParams: urlObj.searchParams,
      hash: urlObj.hash,
      clone: () => new URL(urlObj.toString()),
    };

    this.cookies = {
      get: jest.fn((name) => undefined),
      set: jest.fn(),
      delete: jest.fn(),
    };
    this.headers = new Map();

    // bodyをオプションから取得、またはfetch APIのようなRequestからも
    this._body = options.body || null;
    this.method = options.method || 'GET';

    // リクエストヘッダーを設定
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value);
      });
    }
  }

  async json() {
    if (this._body) {
      return typeof this._body === 'string' ? JSON.parse(this._body) : this._body;
    }
    return {};
  }
}

class NextResponse {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.headers = new Map();
    this.type = 'response';
  }

  // インスタンスメソッドとして json() を追加
  async json() {
    return JSON.parse(this.body);
  }

  static json(body, init) {
    return new NextResponse(JSON.stringify(body), {
      status: init?.status || 200,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
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
