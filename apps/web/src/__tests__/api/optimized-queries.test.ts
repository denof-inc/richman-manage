import { optimizedQueries } from '../../lib/supabase/optimized-queries';
import { cache } from '../../lib/cache';

// 既存のSupabaseモック設定を活用
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [
              {
                id: '1',
                name: 'Test Property',
                user_id: 'test-user',
                created_at: '2024-01-01T00:00:00Z',
              },
            ],
            error: null,
          })),
          single: jest.fn(() => ({
            data: {
              id: '1',
              name: 'Test Property',
              user_id: 'test-user',
              created_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

describe('OptimizedQueries', () => {
  beforeEach(() => {
    cache.clear();
    jest.clearAllMocks();
  });

  describe('getPropertiesWithCache', () => {
    it('should return cached data when available', async () => {
      const testData = [{ id: '1', name: 'Cached Property' }];
      cache.set('properties:test-user', testData);

      const result = await optimizedQueries.getPropertiesWithCache('test-user');
      expect(result).toEqual(testData);
    });

    it('should fetch and cache data when not in cache', async () => {
      const result = await optimizedQueries.getPropertiesWithCache('test-user');
      expect(result).toBeDefined();

      // キャッシュに保存されているかチェック
      const cached = cache.get('properties:test-user');
      expect(cached).toBeDefined();
    });
  });

  describe('getPropertyAnalytics', () => {
    it('should calculate analytics correctly', async () => {
      const result = await optimizedQueries.getPropertyAnalytics('test-property');

      expect(result).toHaveProperty('property');
      expect(result).toHaveProperty('totalLoans');
      expect(result).toHaveProperty('totalRent');
      expect(result).toHaveProperty('totalExpenses');
    });
  });
});
