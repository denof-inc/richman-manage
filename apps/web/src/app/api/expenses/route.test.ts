/**
 * @jest-environment node
 */
import { GET, POST } from './route';
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

// Supabaseクライアントのモック
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Redisキャッシュのモック
jest.mock('@/lib/cache/redis-cache', () => ({
  getCache: jest.fn(() => ({
    invalidateResource: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ApiResponseのモック
jest.mock('@/lib/api/response', () => ({
  ApiResponse: {
    success: jest.fn((data, meta, status = 200) => ({
      json: async () => ({ success: true, data, error: null, meta }),
      status,
    })),
    error: jest.fn((code, message, status) => ({
      json: async () => ({ success: false, data: null, error: { code, message } }),
      status,
    })),
    badRequest: jest.fn((message) => ({
      json: async () => ({ success: false, data: null, error: { code: 'BAD_REQUEST', message } }),
      status: 400,
    })),
    unauthorized: jest.fn(() => ({
      json: async () => ({
        success: false,
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      }),
      status: 401,
    })),
    forbidden: jest.fn((message = 'Forbidden') => ({
      json: async () => ({ success: false, data: null, error: { code: 'FORBIDDEN', message } }),
      status: 403,
    })),
    notFound: jest.fn((message = 'Not Found') => ({
      json: async () => ({ success: false, data: null, error: { code: 'NOT_FOUND', message } }),
      status: 404,
    })),
    validationError: jest.fn((message, details) => ({
      json: async () => ({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message, details },
      }),
      status: 422,
    })),
    internalError: jest.fn((message) => ({
      json: async () => ({
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message },
      }),
      status: 500,
    })),
    paginated: jest.fn((data, page, limit, total) => ({
      json: async () => ({
        success: true,
        data,
        error: null,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }),
      status: 200,
    })),
  },
}));

describe('Expenses API - GET /api/expenses', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('GET - 支出一覧取得', () => {
    it('認証済みユーザーが自分の物件の支出を取得できる', async () => {
      // モックデータ
      const mockExpenses = [
        {
          id: '550e8400-e29b-41d4-a716-446655440301',
          property_id: '550e8400-e29b-41d4-a716-446655440101',
          expense_date: '2024-01-15T00:00:00Z',
          category: 'management_fee',
          amount: 50000,
          vendor: '管理会社ABC',
          description: '1月分管理費',
          receipt_url: null,
          is_recurring: true,
          recurring_frequency: 'monthly',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
          property: {
            id: '550e8400-e29b-41d4-a716-446655440101',
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            name: '青山マンション',
          },
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440302',
          property_id: '550e8400-e29b-41d4-a716-446655440101',
          expense_date: '2024-01-20T00:00:00Z',
          category: 'repair_cost',
          amount: 150000,
          vendor: '修繕工事会社',
          description: '給水管修理',
          receipt_url: 'https://example.com/receipt1.pdf',
          is_recurring: false,
          recurring_frequency: null,
          created_at: '2024-01-20T00:00:00Z',
          updated_at: '2024-01-20T00:00:00Z',
          deleted_at: null,
          property: {
            id: '550e8400-e29b-41d4-a716-446655440101',
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            name: '青山マンション',
          },
        },
      ];

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockExpenses,
          error: null,
          count: 2,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/expenses');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('expenses');
      expect(mockQuery.select).toHaveBeenCalledWith(
        '*, property:properties!inner(id, user_id, name)',
        { count: 'exact' }
      );
      expect(mockQuery.eq).toHaveBeenCalledWith(
        'property.user_id',
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('日付範囲でフィルタリングできる', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成（日付フィルタ付き）
      const request = new NextRequest(
        'http://localhost:3000/api/expenses?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z'
      );

      // APIを呼び出し
      await GET(request);

      // アサーション
      expect(mockQuery.gte).toHaveBeenCalledWith('expense_date', '2024-01-01T00:00:00Z');
      expect(mockQuery.lte).toHaveBeenCalledWith('expense_date', '2024-01-31T23:59:59Z');
    });

    it('カテゴリーでフィルタリングできる', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成（カテゴリーフィルタ付き）
      const request = new NextRequest('http://localhost:3000/api/expenses?category=management_fee');

      // APIを呼び出し
      await GET(request);

      // アサーション
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'management_fee');
    });

    it('未認証ユーザーが401エラーを受け取る', async () => {
      // 認証失敗をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/expenses');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(response.status).toBe(401);
    });
  });

  describe('POST - 支出作成', () => {
    it('有効なデータで新規支出を作成できる', async () => {
      const newExpenseData = {
        property_id: '550e8400-e29b-41d4-a716-446655440101',
        expense_date: '2024-02-01T00:00:00Z',
        category: 'utility',
        amount: 15000,
        vendor: '東京電力',
        description: '2月分電気代',
        is_recurring: true,
        recurring_frequency: 'monthly',
      };

      const createdExpense = {
        id: '550e8400-e29b-41d4-a716-446655440303',
        ...newExpenseData,
        receipt_url: null,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
        deleted_at: null,
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // 物件の所有権確認をモック
      const mockPropertyQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: '550e8400-e29b-41d4-a716-446655440101' },
          error: null,
        }),
      };

      // データベース挿入をモック
      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdExpense,
          error: null,
        }),
      };

      // fromを2回呼ぶ：1回目は物件確認、2回目は支出作成
      mockSupabaseClient.from
        .mockReturnValueOnce(mockPropertyQuery)
        .mockReturnValueOnce(mockInsert);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(newExpenseData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('properties');
      expect(data.success).toBe(true);
      expect(data.data.amount).toBe(newExpenseData.amount);
      expect(response.status).toBe(201);
    });

    it('他人の物件に対する支出作成で403エラーを返す', async () => {
      const newExpenseData = {
        property_id: '550e8400-e29b-41d4-a716-446655440999',
        expense_date: '2024-02-01T00:00:00Z',
        category: 'management_fee',
        amount: 50000,
        vendor: '不正な支払先',
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // 物件の所有権確認をモック（権限なし）
      const mockPropertyQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockPropertyQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(newExpenseData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(response.status).toBe(403);
    });

    it('無効なカテゴリーでバリデーションエラーを返す', async () => {
      const invalidExpenseData = {
        property_id: '550e8400-e29b-41d4-a716-446655440101',
        expense_date: '2024-02-01T00:00:00Z',
        category: 'invalid_category', // 無効なカテゴリー
        amount: 10000,
        vendor: 'テスト支払先',
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(invalidExpenseData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(422);
    });
  });
});
