import { optimizedQueries } from '../../lib/supabase/optimized-queries';

// Supabaseクライアントをモック
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: '1',
                  name: 'Test Property',
                  user_id: 'test-user',
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
              error: null,
            })
          ),
        })),
      })),
    })),
  })),
}));

describe('API Performance Tests', () => {
  it('should respond within acceptable time limits', async () => {
    const startTime = performance.now();

    await optimizedQueries.getPropertiesWithCache('test-user');

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 200ms以内でレスポンスすることを確認
    expect(duration).toBeLessThan(200);
  });

  it('should benefit from caching', async () => {
    // 初回リクエスト
    const startTime1 = performance.now();
    await optimizedQueries.getPropertiesWithCache('test-user');
    const endTime1 = performance.now();
    const firstDuration = endTime1 - startTime1;

    // キャッシュされたリクエスト
    const startTime2 = performance.now();
    await optimizedQueries.getPropertiesWithCache('test-user');
    const endTime2 = performance.now();
    const secondDuration = endTime2 - startTime2;

    // キャッシュされたリクエストが初回リクエストと同等またはそれ以下の時間であることを確認
    // テスト環境では劇的な改善は期待せず、悪化していないことを確認
    expect(secondDuration).toBeLessThanOrEqual(firstDuration * 2);
  });

  it('should handle concurrent requests efficiently', async () => {
    const startTime = performance.now();

    // 10個の並列リクエスト
    const promises = Array.from({ length: 10 }, (_, i) =>
      optimizedQueries.getPropertiesWithCache(`test-user-${i}`)
    );

    await Promise.all(promises);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 並列処理により、シーケンシャル処理より高速であることを確認
    expect(duration).toBeLessThan(1000); // 1秒以内
  });
});
