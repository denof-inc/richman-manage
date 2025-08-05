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

describe('RentRolls API - GET /api/rent-rolls', () => {
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

  describe('GET - レントロール一覧取得', () => {
    it('認証済みユーザーが自分の物件のレントロールを取得できる', async () => {
      // モックデータ
      const mockRentRolls = [
        {
          id: '550e8400-e29b-41d4-a716-446655440301',
          property_id: '550e8400-e29b-41d4-a716-446655440101',
          room_number: '101',
          tenant_name: '山田太郎',
          monthly_rent: 120000,
          occupancy_status: 'occupied',
          lease_start_date: '2024-01-01T00:00:00Z',
          lease_end_date: '2025-12-31T00:00:00Z',
          security_deposit: 120000,
          key_money: 120000,
          notes: null,
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
          room_number: '102',
          tenant_name: null,
          monthly_rent: 115000,
          occupancy_status: 'vacant',
          lease_start_date: null,
          lease_end_date: null,
          security_deposit: null,
          key_money: null,
          notes: '入居者募集中',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
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
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockRentRolls,
          error: null,
          count: 2,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/rent-rolls');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rent_rolls');
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

    it('物件IDでフィルタリングできる', async () => {
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

      // リクエストを作成（フィルタパラメータ付き）
      const request = new NextRequest(
        'http://localhost:3000/api/rent-rolls?property_id=550e8400-e29b-41d4-a716-446655440101'
      );

      // APIを呼び出し
      await GET(request);

      // アサーション
      expect(mockQuery.eq).toHaveBeenCalledWith(
        'property_id',
        '550e8400-e29b-41d4-a716-446655440101'
      );
    });

    it('入居状況でフィルタリングできる', async () => {
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

      // リクエストを作成（フィルタパラメータ付き）
      const request = new NextRequest(
        'http://localhost:3000/api/rent-rolls?occupancy_status=vacant'
      );

      // APIを呼び出し
      await GET(request);

      // アサーション
      expect(mockQuery.eq).toHaveBeenCalledWith('occupancy_status', 'vacant');
    });

    it('未認証ユーザーが401エラーを受け取る', async () => {
      // 認証失敗をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/rent-rolls');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(response.status).toBe(401);
    });
  });

  describe('POST - レントロール作成', () => {
    it('有効なデータで新規レントロールを作成できる', async () => {
      const newRentRollData = {
        property_id: '550e8400-e29b-41d4-a716-446655440101',
        room_number: '201',
        tenant_name: '鈴木花子',
        monthly_rent: 130000,
        occupancy_status: 'occupied',
        lease_start_date: '2024-02-01T00:00:00Z',
        lease_end_date: '2026-01-31T00:00:00Z',
        security_deposit: 130000,
        key_money: 130000,
        notes: '新規入居者',
      };

      const createdRentRoll = {
        id: '550e8400-e29b-41d4-a716-446655440303',
        ...newRentRollData,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
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

      // 重複チェックをモック
      const mockDuplicateQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      // データベース挿入をモック
      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdRentRoll,
          error: null,
        }),
      };

      // fromを3回呼ぶ：1回目は物件確認、2回目は重複チェック、3回目はレントロール作成
      mockSupabaseClient.from
        .mockReturnValueOnce(mockPropertyQuery)
        .mockReturnValueOnce(mockDuplicateQuery)
        .mockReturnValueOnce(mockInsert);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/rent-rolls', {
        method: 'POST',
        body: JSON.stringify(newRentRollData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('properties');
      expect(data.success).toBe(true);
      expect(data.data.room_number).toBe(newRentRollData.room_number);
      expect(response.status).toBe(201);
    });

    it('重複する部屋番号で409エラーを返す', async () => {
      const duplicateRentRollData = {
        property_id: '550e8400-e29b-41d4-a716-446655440101',
        room_number: '101', // 既存の部屋番号
        tenant_name: '新しい入居者',
        monthly_rent: 125000,
        occupancy_status: 'occupied',
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

      // 重複チェックをモック（既存データあり）
      const mockDuplicateQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: '550e8400-e29b-41d4-a716-446655440301' },
          error: null,
        }),
      };

      // fromを2回呼ぶ：1回目は物件確認、2回目は重複チェック
      mockSupabaseClient.from
        .mockReturnValueOnce(mockPropertyQuery)
        .mockReturnValueOnce(mockDuplicateQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/rent-rolls', {
        method: 'POST',
        body: JSON.stringify(duplicateRentRollData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONFLICT');
      expect(response.status).toBe(409);
    });

    it('他人の物件に対するレントロール作成で403エラーを返す', async () => {
      const newRentRollData = {
        property_id: '550e8400-e29b-41d4-a716-446655440999',
        room_number: '101',
        tenant_name: '不正な入居者',
        monthly_rent: 100000,
        occupancy_status: 'occupied',
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
      const request = new NextRequest('http://localhost:3000/api/rent-rolls', {
        method: 'POST',
        body: JSON.stringify(newRentRollData),
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

    it('無効な入居状況でバリデーションエラーを返す', async () => {
      const invalidRentRollData = {
        property_id: '550e8400-e29b-41d4-a716-446655440101',
        room_number: '301',
        tenant_name: 'テスト入居者',
        monthly_rent: 100000,
        occupancy_status: 'invalid_status', // 無効な入居状況
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/rent-rolls', {
        method: 'POST',
        body: JSON.stringify(invalidRentRollData),
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
