import { rateLimiter } from '../../lib/security/rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    // テスト前にクリーンアップ
    rateLimiter.cleanup();
  });

  it('should allow requests within limit', () => {
    const identifier = 'test-user';

    for (let i = 0; i < 50; i++) {
      expect(rateLimiter.isAllowed(identifier)).toBe(true);
    }
  });

  it('should block requests exceeding limit', () => {
    const identifier = 'test-user-2';

    // 制限まで使い切る
    for (let i = 0; i < 100; i++) {
      rateLimiter.isAllowed(identifier);
    }

    // 101回目は拒否される
    expect(rateLimiter.isAllowed(identifier)).toBe(false);
  });

  it('should return correct remaining requests', () => {
    const identifier = 'test-user-3';

    // 10回リクエスト
    for (let i = 0; i < 10; i++) {
      rateLimiter.isAllowed(identifier);
    }

    expect(rateLimiter.getRemainingRequests(identifier)).toBe(90);
  });
});
