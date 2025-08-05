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

describe('Loans API - GET /api/loans', () => {
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

  describe('GET - 借入一覧取得', () => {
    it('認証済みユーザーが自分の物件に紐づく借入一覧を取得できる', async () => {
      // モックデータ
      const mockLoans = [
        {
          id: '550e8400-e29b-41d4-a716-446655440201',
          property_id: '550e8400-e29b-41d4-a716-446655440101',
          lender_name: 'みずほ銀行',
          loan_type: 'mortgage',
          principal_amount: 40000000,
          current_balance: 35000000,
          interest_rate: 1.2,
          loan_term_months: 420,
          monthly_payment: 120000,
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
          id: '550e8400-e29b-41d4-a716-446655440202',
          property_id: '550e8400-e29b-41d4-a716-446655440102',
          lender_name: '三菱UFJ銀行',
          loan_type: 'business',
          principal_amount: 80000000,
          current_balance: 75000000,
          interest_rate: 2.5,
          loan_term_months: 240,
          monthly_payment: 380000,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          deleted_at: null,
          property: {
            id: '550e8400-e29b-41d4-a716-446655440102',
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            name: '渋谷ビル',
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
          data: mockLoans,
          error: null,
          count: 2,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/loans');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('loans');
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

    it('未認証ユーザーが401エラーを受け取る', async () => {
      // 認証失敗をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/loans');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(response.status).toBe(401);
    });

    it('特定の物件IDでフィルタリングできる', async () => {
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
        'http://localhost:3000/api/loans?property_id=550e8400-e29b-41d4-a716-446655440101'
      );

      // APIを呼び出し
      await GET(request);

      // アサーション
      expect(mockQuery.eq).toHaveBeenCalledWith(
        'property.user_id',
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(mockQuery.eq).toHaveBeenCalledWith(
        'property_id',
        '550e8400-e29b-41d4-a716-446655440101'
      );
    });

    it('金融機関名で検索できる', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 1,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成（検索パラメータ付き）
      const request = new NextRequest('http://localhost:3000/api/loans?search=みずほ');

      // APIを呼び出し
      await GET(request);

      // アサーション
      expect(mockQuery.ilike).toHaveBeenCalledWith('lender_name', '%みずほ%');
    });
  });

  describe('POST - 借入作成', () => {
    it('有効なデータで新規借入を作成できる', async () => {
      const newLoanData = {
        property_id: '550e8400-e29b-41d4-a716-446655440101',
        lender_name: 'りそな銀行',
        loan_type: 'mortgage',
        principal_amount: 30000000,
        current_balance: 30000000,
        interest_rate: 1.5,
        loan_term_months: 360,
        monthly_payment: 100000,
      };

      const createdLoan = {
        id: '550e8400-e29b-41d4-a716-446655440203',
        ...newLoanData,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
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
          data: createdLoan,
          error: null,
        }),
      };

      // fromを2回呼ぶ：1回目は物件確認、2回目は借入作成
      mockSupabaseClient.from
        .mockReturnValueOnce(mockPropertyQuery)
        .mockReturnValueOnce(mockInsert);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/loans', {
        method: 'POST',
        body: JSON.stringify(newLoanData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('properties');
      expect(mockPropertyQuery.eq).toHaveBeenCalledWith(
        'id',
        '550e8400-e29b-41d4-a716-446655440101'
      );
      expect(mockPropertyQuery.eq).toHaveBeenCalledWith(
        'user_id',
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(data.success).toBe(true);
      expect(data.data.lender_name).toBe(newLoanData.lender_name);
    });

    it('無効な金利でバリデーションエラーを返す', async () => {
      const invalidLoanData = {
        property_id: '550e8400-e29b-41d4-a716-446655440101',
        lender_name: 'りそな銀行',
        loan_type: 'mortgage',
        principal_amount: 30000000,
        current_balance: 30000000,
        interest_rate: -1, // 負の金利
        loan_term_months: 360,
        monthly_payment: 100000,
      };

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/loans', {
        method: 'POST',
        body: JSON.stringify(invalidLoanData),
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

    it('他人の物件に対する借入作成で403エラーを返す', async () => {
      const newLoanData = {
        property_id: '550e8400-e29b-41d4-a716-446655440999',
        lender_name: 'りそな銀行',
        loan_type: 'mortgage',
        principal_amount: 30000000,
        current_balance: 30000000,
        interest_rate: 1.5,
        loan_term_months: 360,
        monthly_payment: 100000,
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
      const request = new NextRequest('http://localhost:3000/api/loans', {
        method: 'POST',
        body: JSON.stringify(newLoanData),
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
  });
});
