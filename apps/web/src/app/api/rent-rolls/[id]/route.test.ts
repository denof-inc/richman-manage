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

describe('RentRoll API - /api/rent-rolls/[id]', () => {
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

  const mockRentRoll = {
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
      user_id: '550e8400-e29b-41d4-a716-446655440000',
    },
  };

  describe('GET - レントロール詳細取得', () => {
    it('所有者が自分の物件のレントロール詳細を取得できる', async () => {
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
          data: mockRentRoll,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/rent-rolls/550e8400-e29b-41d4-a716-446655440301'
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440301' } };

      // APIを呼び出し
      const response = await GET(request, context);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rent_rolls');
      expect(mockQuery.select).toHaveBeenCalledWith('*, property:properties!inner(user_id)');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440301');
      expect(mockQuery.eq).toHaveBeenCalledWith(
        'property.user_id',
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockRentRoll.id);
    });

    it('存在しないレントロールIDで404エラーを返す', async () => {
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
      const request = new NextRequest('http://localhost:3000/api/rent-rolls/non-existent-id');
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

  describe('PUT - レントロール更新', () => {
    it('所有者が自分の物件のレントロールを更新できる', async () => {
      const updateData = {
        tenant_name: '佐藤次郎',
        monthly_rent: 125000,
        occupancy_status: 'occupied',
      };

      const updatedRentRoll = {
        ...mockRentRoll,
        ...updateData,
        updated_at: '2024-01-02T00:00:00Z',
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // 既存レントロールの確認をモック
      const mockSelect = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRentRoll,
          error: null,
        }),
      };

      // 更新をモック
      const mockUpdate = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedRentRoll,
          error: null,
        }),
      };

      // fromを2回呼ぶ：1回目は確認、2回目は更新
      mockSupabaseClient.from.mockReturnValueOnce(mockSelect).mockReturnValueOnce(mockUpdate);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/rent-rolls/550e8400-e29b-41d4-a716-446655440301',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440301' } };

      // APIを呼び出し
      const response = await PUT(request, context);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(true);
      expect(data.data.tenant_name).toBe(updateData.tenant_name);
      expect(data.data.monthly_rent).toBe(updateData.monthly_rent);
    });

    it('入居状況を空室に変更する際に入居者情報をクリアする', async () => {
      const updateData = {
        occupancy_status: 'vacant',
      };

      const updatedRentRoll = {
        ...mockRentRoll,
        occupancy_status: 'vacant',
        tenant_name: null,
        lease_start_date: null,
        lease_end_date: null,
        updated_at: '2024-01-02T00:00:00Z',
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // 既存レントロールの確認をモック
      const mockSelect = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRentRoll,
          error: null,
        }),
      };

      // 更新をモック
      const mockUpdate = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedRentRoll,
          error: null,
        }),
      };

      // fromを2回呼ぶ：1回目は確認、2回目は更新
      mockSupabaseClient.from.mockReturnValueOnce(mockSelect).mockReturnValueOnce(mockUpdate);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/rent-rolls/550e8400-e29b-41d4-a716-446655440301',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440301' } };

      // APIを呼び出し
      const response = await PUT(request, context);
      const data = await response.json();

      // アサーション
      expect(mockUpdate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          occupancy_status: 'vacant',
          tenant_name: null,
          lease_start_date: null,
          lease_end_date: null,
        })
      );
      expect(data.success).toBe(true);
    });

    it('他人の物件のレントロールを更新しようとすると404エラーを返す', async () => {
      const updateData = { monthly_rent: 130000 };

      // 認証をモック（別のユーザー）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440999' } },
        error: null,
      });

      // 既存レントロールの確認をモック（権限なし）
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
        'http://localhost:3000/api/rent-rolls/550e8400-e29b-41d4-a716-446655440301',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440301' } };

      // APIを呼び出し
      const response = await PUT(request, context);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE - レントロール削除', () => {
    it('所有者が自分の物件のレントロールを削除できる', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // 既存レントロールの確認をモック
      const mockSelect = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRentRoll,
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
        'http://localhost:3000/api/rent-rolls/550e8400-e29b-41d4-a716-446655440301',
        {
          method: 'DELETE',
        }
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440301' } };

      // APIを呼び出し
      const response = await DELETE(request, context);
      const data = await response.json();

      // アサーション
      expect(mockUpdate.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ message: 'レントロールを削除しました' });
    });

    it('他人の物件のレントロールを削除しようとすると404エラーを返す', async () => {
      // 認証をモック（別のユーザー）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440999' } },
        error: null,
      });

      // 既存レントロールの確認をモック（権限なし）
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
        'http://localhost:3000/api/rent-rolls/550e8400-e29b-41d4-a716-446655440301',
        {
          method: 'DELETE',
        }
      );
      const context = { params: { id: '550e8400-e29b-41d4-a716-446655440301' } };

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
