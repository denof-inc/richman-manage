/**
 * @jest-environment node
 */
import { GET, PUT, DELETE } from './route';
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
  },
}));

describe('Property API - /api/properties/[id]', () => {
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

  const mockProperty = {
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
  };

  describe('GET - 物件詳細取得', () => {
    it('所有者が自分の物件詳細を取得できる', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProperty,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/properties/550e8400-e29b-41d4-a716-446655440101'
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440101' } };

      // APIを呼び出し
      const response = await GET(request, context);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('properties');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440101');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', '550e8400-e29b-41d4-a716-446655440000');
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockProperty);
    });

    it('存在しない物件IDで404エラーを返す', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // データベースクエリをモック（データなし）
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/properties/non-existent-id');
      const context = { params: { id: 'non-existent-id' } };

      // APIを呼び出し
      const response = await GET(request, context);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(response.status).toBe(404);
    });
  });

  describe('PUT - 物件更新', () => {
    it('所有者が自分の物件を更新できる', async () => {
      const updateData = {
        name: '青山マンション（リノベーション済み）',
        current_valuation: 60000000,
      };

      const updatedProperty = {
        ...mockProperty,
        ...updateData,
        updated_at: '2024-01-02T00:00:00Z',
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // 既存物件の確認をモック
      const mockSelect = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProperty,
          error: null,
        }),
      };

      // 更新をモック
      const mockUpdate = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedProperty,
          error: null,
        }),
      };

      // fromを2回呼ぶ：1回目は確認、2回目は更新
      mockSupabaseClient.from.mockReturnValueOnce(mockSelect).mockReturnValueOnce(mockUpdate);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/properties/550e8400-e29b-41d4-a716-446655440101',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440101' } };

      // APIを呼び出し
      const response = await PUT(request, context);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(updateData.name);
      expect(data.data.current_valuation).toBe(updateData.current_valuation);
    });

    it('他人の物件を更新しようとすると403エラーを返す', async () => {
      const updateData = { name: '不正な更新' };

      // 認証をモック（別のユーザー）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440999' } },
        error: null,
      });

      // 既存物件の確認をモック（権限なし）
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/properties/550e8400-e29b-41d4-a716-446655440101',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440101' } };

      // APIを呼び出し
      const response = await PUT(request, context);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE - 物件削除', () => {
    it('所有者が自分の物件を削除できる', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // 既存物件の確認をモック
      const mockSelect = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProperty,
          error: null,
        }),
      };

      // 削除（論理削除）をモック
      const mockUpdate = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      // fromを2回呼ぶ：1回目は確認、2回目は削除
      mockSupabaseClient.from.mockReturnValueOnce(mockSelect).mockReturnValueOnce(mockUpdate);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/properties/550e8400-e29b-41d4-a716-446655440101',
        {
          method: 'DELETE',
        }
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440101' } };

      // APIを呼び出し
      const response = await DELETE(request, context);
      const data = await response.json();

      // アサーション
      expect(mockUpdate.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ message: '物件を削除しました' });
    });

    it('他人の物件を削除しようとすると404エラーを返す', async () => {
      // 認証をモック（別のユーザー）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440999' } },
        error: null,
      });

      // 既存物件の確認をモック（権限なし）
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/properties/550e8400-e29b-41d4-a716-446655440101',
        {
          method: 'DELETE',
        }
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440101' } };

      // APIを呼び出し
      const response = await DELETE(request, context);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(response.status).toBe(404);
    });
  });
});
