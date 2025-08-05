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
    conflict: jest.fn((message) => ({
      json: async () => ({ success: false, data: null, error: { code: 'CONFLICT', message } }),
      status: 409,
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

describe('Properties API - GET /api/properties', () => {
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

  describe('GET - 物件一覧取得', () => {
    it('認証済みユーザーが自分の物件一覧を取得できる', async () => {
      // モックデータ
      const mockProperties = [
        {
          id: '550e8400-e29b-41d4-a716-446655440101',
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          name: '青山マンション',
          address: '東京都港区青山1-1-1',
          property_type: 'apartment',
          purchase_price: 50000000,
          purchase_date: '2023-01-01',
          current_valuation: 55000000,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440102',
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          name: '渋谷ビル',
          address: '東京都渋谷区渋谷2-2-2',
          property_type: 'commercial',
          purchase_price: 100000000,
          purchase_date: '2023-06-01',
          current_valuation: 105000000,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          deleted_at: null,
        },
      ];

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'user@example.com' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockProperties,
          error: null,
          count: 2,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/properties');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('properties');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', '550e8400-e29b-41d4-a716-446655440000');
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockProperties);
    });

    it('未認証ユーザーが401エラーを受け取る', async () => {
      // 認証失敗をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/properties');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(response.status).toBe(401);
    });

    it('物件タイプでフィルタリングできる', async () => {
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
          count: 1,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成（フィルタパラメータ付き）
      const request = new NextRequest(
        'http://localhost:3000/api/properties?property_type=apartment'
      );

      // APIを呼び出し
      await GET(request);

      // アサーション
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', '550e8400-e29b-41d4-a716-446655440000');
      expect(mockQuery.eq).toHaveBeenCalledWith('property_type', 'apartment');
    });

    it('検索クエリでフィルタリングできる', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 1,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成（検索パラメータ付き）
      const request = new NextRequest('http://localhost:3000/api/properties?search=青山');

      // APIを呼び出し
      await GET(request);

      // アサーション
      expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%青山%,address.ilike.%青山%');
    });
  });

  describe('POST - 物件作成', () => {
    it('有効なデータで新規物件を作成できる', async () => {
      const newPropertyData = {
        name: '新宿マンション',
        address: '東京都新宿区新宿3-3-3',
        property_type: 'apartment',
        purchase_price: 70000000,
        purchase_date: '2024-01-15',
        current_valuation: 72000000,
      };

      const createdProperty = {
        id: '550e8400-e29b-41d4-a716-446655440103',
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        ...newPropertyData,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        deleted_at: null,
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // データベース挿入をモック
      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdProperty,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockInsert);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/properties', {
        method: 'POST',
        body: JSON.stringify(newPropertyData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(newPropertyData.name);
      expect(data.data.address).toBe(newPropertyData.address);
    });

    it('無効な購入価格でバリデーションエラーを返す', async () => {
      const invalidPropertyData = {
        name: '新宿マンション',
        address: '東京都新宿区新宿3-3-3',
        property_type: 'apartment',
        purchase_price: -1000, // 負の値
        purchase_date: '2024-01-15',
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/properties', {
        method: 'POST',
        body: JSON.stringify(invalidPropertyData),
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

    it('未認証ユーザーが401エラーを受け取る', async () => {
      const newPropertyData = {
        name: '新宿マンション',
        address: '東京都新宿区新宿3-3-3',
        property_type: 'apartment',
        purchase_price: 70000000,
        purchase_date: '2024-01-15',
      };

      // 認証失敗をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/properties', {
        method: 'POST',
        body: JSON.stringify(newPropertyData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(response.status).toBe(401);
    });
  });
});
