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

describe('Expense API - /api/expenses/[id]', () => {
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

  const mockExpense = {
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
      user_id: '550e8400-e29b-41d4-a716-446655440000',
    },
  };

  describe('GET - 支出詳細取得', () => {
    it('所有者が自分の物件の支出詳細を取得できる', async () => {
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
          data: mockExpense,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/expenses/550e8400-e29b-41d4-a716-446655440301'
      );
      const context = { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440301' }) };

      // APIを呼び出し
      const response = await GET(request, context);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('expenses');
      expect(mockQuery.select).toHaveBeenCalledWith('*, property:properties!inner(user_id)');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440301');
      expect(mockQuery.eq).toHaveBeenCalledWith(
        'property.user_id',
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockExpense.id);
    });

    it('存在しない支出IDで404エラーを返す', async () => {
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
      const request = new NextRequest('http://localhost:3000/api/expenses/non-existent-id');
      const context = { params: Promise.resolve({ id: 'non-existent-id' }) };

      // APIを呼び出し
      const response = await GET(request, context);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(response.status).toBe(404);
    });
  });

  describe('PUT - 支出更新', () => {
    it('所有者が自分の物件の支出を更新できる', async () => {
      const updateData = {
        amount: 55000,
        description: '1月分管理費（改定後）',
      };

      const updatedExpense = {
        ...mockExpense,
        ...updateData,
        updated_at: '2024-01-02T00:00:00Z',
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // 既存支出の確認をモック
      const mockSelect = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockExpense,
          error: null,
        }),
      };

      // 更新をモック
      const mockUpdate = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedExpense,
          error: null,
        }),
      };

      // fromを2回呼ぶ：1回目は確認、2回目は更新
      mockSupabaseClient.from.mockReturnValueOnce(mockSelect).mockReturnValueOnce(mockUpdate);

      // リクエストを作成
      const request = new NextRequest(
        'http://localhost:3000/api/expenses/550e8400-e29b-41d4-a716-446655440301',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const context = { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440301' }) };

      // APIを呼び出し
      const response = await PUT(request, context);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(true);
      expect(data.data.amount).toBe(updateData.amount);
      expect(data.data.description).toBe(updateData.description);
    });

    it('他人の物件の支出を更新しようとすると404エラーを返す', async () => {
      const updateData = { amount: 60000 };

      // 認証をモック（別のユーザー）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440999' } },
        error: null,
      });

      // 既存支出の確認をモック（権限なし）
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
        'http://localhost:3000/api/expenses/550e8400-e29b-41d4-a716-446655440301',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const context = { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440301' }) };

      // APIを呼び出し
      const response = await PUT(request, context);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE - 支出削除', () => {
    it('所有者が自分の物件の支出を削除できる', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // 既存支出の確認をモック
      const mockSelect = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockExpense,
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
        'http://localhost:3000/api/expenses/550e8400-e29b-41d4-a716-446655440301',
        {
          method: 'DELETE',
        }
      );
      const context = { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440301' }) };

      // APIを呼び出し
      const response = await DELETE(request, context);
      const data = await response.json();

      // アサーション
      expect(mockUpdate.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ message: '支出を削除しました' });
    });

    it('他人の物件の支出を削除しようとすると404エラーを返す', async () => {
      // 認証をモック（別のユーザー）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440999' } },
        error: null,
      });

      // 既存支出の確認をモック（権限なし）
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
        'http://localhost:3000/api/expenses/550e8400-e29b-41d4-a716-446655440301',
        {
          method: 'DELETE',
        }
      );
      const context = { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440301' }) };

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
