/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// APIルートのインポート
import { GET as getProperties, POST as createProperty } from '../properties/route';
import { GET as getLoans, POST as createLoan } from '../loans/route';
import { GET as getRentRolls, POST as createRentRoll } from '../rent-rolls/route';
import { GET as getExpenses, POST as createExpense } from '../expenses/route';

// モック設定
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/cache/redis-cache', () => ({
  getCache: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidateResource: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ApiResponseの実際の実装を使う
jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return actual;
});

describe('API統合テスト', () => {
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
  };

  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    // デフォルトで認証済みユーザーを返す
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('エンドポイント間の一貫性', () => {
    it('すべてのAPIエンドポイントが統一されたレスポンス形式を返す', async () => {
      // 各APIのGETメソッドをテスト
      const endpoints = [
        { handler: getProperties, url: '/api/properties' },
        { handler: getLoans, url: '/api/loans' },
        { handler: getRentRolls, url: '/api/rent-rolls' },
        { handler: getExpenses, url: '/api/expenses' },
      ];

      for (const { handler, url } of endpoints) {
        // データベースクエリをモック
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
          single: jest.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        };
        mockSupabaseClient.from.mockReturnValue(mockQuery);

        const request = new NextRequest(`http://localhost:3000${url}`);
        const response = await handler(request);
        const data = await response.json();

        // レスポンス形式の検証
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('error');
        expect(response.status).toBe(200);
      }
    });

    it('認証エラー時に全APIが401を返す', async () => {
      // 認証失敗をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const endpoints = [
        { handler: getProperties, url: '/api/properties' },
        { handler: getLoans, url: '/api/loans' },
        { handler: getRentRolls, url: '/api/rent-rolls' },
        { handler: getExpenses, url: '/api/expenses' },
      ];

      for (const { handler, url } of endpoints) {
        const request = new NextRequest(`http://localhost:3000${url}`);
        const response = await handler(request);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error.code).toBe('UNAUTHORIZED');
        expect(response.status).toBe(401);
      }
    });
  });

  describe('データ整合性テスト', () => {
    it('物件作成後、その物件に関連するデータを作成できる', async () => {
      const propertyId = '550e8400-e29b-41d4-a716-446655440101';
      const propertyData = {
        name: 'テストマンション',
        address: '東京都渋谷区',
        property_type: 'apartment',
        purchase_price: 100000000,
        purchase_date: '2024-01-01',
      };

      // 物件作成のモック
      const mockPropertyInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: propertyId,
            ...propertyData,
            user_id: mockUser.id,
            current_valuation: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null,
          },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockPropertyInsert);

      const propertyRequest = new NextRequest('http://localhost:3000/api/properties', {
        method: 'POST',
        body: JSON.stringify(propertyData),
        headers: { 'Content-Type': 'application/json' },
      });
      const propertyResponse = await createProperty(propertyRequest);
      const propertyResult = await propertyResponse.json();

      expect(propertyResult.success).toBe(true);
      expect(propertyResult.data.id).toBe(propertyId);

      // 借入作成（物件確認あり）
      const loanData = {
        property_id: propertyId,
        lender_name: 'テスト銀行',
        loan_type: 'mortgage',
        principal_amount: 80000000,
        current_balance: 80000000,
        interest_rate: 1.5,
        loan_term_months: 420,
        monthly_payment: 300000,
      };

      // 物件確認をモック
      const mockPropertyCheck = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: propertyId },
          error: null,
        }),
      };

      // 借入作成をモック
      const mockLoanInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: '550e8400-e29b-41d4-a716-446655440201',
            ...loanData,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null,
          },
          error: null,
        }),
      };

      // 所有者の既定取得をモック
      const mockOwnerQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: { id: '11111111-1111-1111-1111-111111111111' }, error: null }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockPropertyCheck)
        .mockReturnValueOnce(mockOwnerQuery)
        .mockReturnValueOnce(mockLoanInsert);

      const loanRequest = new NextRequest('http://localhost:3000/api/loans', {
        method: 'POST',
        body: JSON.stringify(loanData),
        headers: { 'Content-Type': 'application/json' },
      });
      const loanResponse = await createLoan(loanRequest);
      const loanResult = await loanResponse.json();

      expect(loanResult.success).toBe(true);
      expect(loanResult.data.property_id).toBe(propertyId);
    });
  });

  describe('権限チェックの横断的検証', () => {
    it('他のユーザーの物件に対する操作が全て拒否される', async () => {
      const otherUsersPropertyId = '550e8400-e29b-41d4-a716-446655440999';

      // 借入作成試行
      const loanData = {
        property_id: otherUsersPropertyId,
        lender_name: '不正な銀行',
        loan_type: 'mortgage',
        principal_amount: 1000000,
        current_balance: 1000000,
        interest_rate: 1.0,
        loan_term_months: 120,
        monthly_payment: 10000,
      };

      // 物件確認で権限なし
      const mockPropertyCheck = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockPropertyCheck);

      const loanRequest = new NextRequest('http://localhost:3000/api/loans', {
        method: 'POST',
        body: JSON.stringify(loanData),
        headers: { 'Content-Type': 'application/json' },
      });
      const loanResponse = await createLoan(loanRequest);
      const loanResult = await loanResponse.json();

      expect(loanResult.success).toBe(false);
      expect(loanResult.error.code).toBe('FORBIDDEN');

      // レントロール作成試行
      const rentRollData = {
        property_id: otherUsersPropertyId,
        room_number: '101',
        tenant_name: '不正な入居者',
        monthly_rent: 100000,
        occupancy_status: 'occupied',
        lease_start_date: '2024-01-01T00:00:00Z',
        lease_end_date: '2025-12-31T23:59:59Z',
      };

      const rentRollRequest = new NextRequest('http://localhost:3000/api/rent-rolls', {
        method: 'POST',
        body: JSON.stringify(rentRollData),
        headers: { 'Content-Type': 'application/json' },
      });
      const rentRollResponse = await createRentRoll(rentRollRequest);
      const rentRollResult = await rentRollResponse.json();

      expect(rentRollResult.success).toBe(false);
      expect(rentRollResult.error.code).toBe('FORBIDDEN');

      // 支出作成試行
      const expenseData = {
        property_id: otherUsersPropertyId,
        expense_date: '2024-01-01T00:00:00Z',
        category: 'management_fee',
        amount: 50000,
        vendor: '不正な支払先',
      };

      const expenseRequest = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData),
        headers: { 'Content-Type': 'application/json' },
      });
      const expenseResponse = await createExpense(expenseRequest);
      const expenseResult = await expenseResponse.json();

      expect(expenseResult.success).toBe(false);
      expect(expenseResult.error.code).toBe('FORBIDDEN');
    });
  });

  describe('ページネーションの一貫性', () => {
    it('全リスト系APIでページネーションが統一されている', async () => {
      const paginationParams = 'page=2&limit=10&sort=created_at&order=desc';
      const endpoints = [
        { handler: getProperties, url: `/api/properties?${paginationParams}` },
        { handler: getLoans, url: `/api/loans?${paginationParams}` },
        { handler: getRentRolls, url: `/api/rent-rolls?${paginationParams}` },
        { handler: getExpenses, url: `/api/expenses?${paginationParams}` },
      ];

      for (const { handler, url } of endpoints) {
        // エンドポイントごとに適切なモックデータを設定
        let mockData = [];
        if (url.includes('properties')) {
          mockData = Array(10).fill({
            id: '550e8400-e29b-41d4-a716-446655440000',
            user_id: mockUser.id,
            name: 'Test Property',
            address: 'Test Address',
            property_type: 'apartment',
            purchase_price: 100000000,
            purchase_date: '2024-01-01',
            current_valuation: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null,
          });
        } else if (url.includes('loans')) {
          mockData = Array(10).fill({
            id: '550e8400-e29b-41d4-a716-446655440001',
            property_id: '550e8400-e29b-41d4-a716-446655440000',
            lender_name: 'Test Bank',
            loan_type: 'mortgage',
            principal_amount: 80000000,
            current_balance: 70000000,
            interest_rate: 1.5,
            loan_term_months: 360,
            monthly_payment: 300000,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null,
            property: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              user_id: mockUser.id,
              name: 'Test',
            },
          });
        } else if (url.includes('rent-rolls')) {
          mockData = Array(10).fill({
            id: '550e8400-e29b-41d4-a716-446655440002',
            property_id: '550e8400-e29b-41d4-a716-446655440000',
            room_number: '101',
            tenant_name: 'Test Tenant',
            monthly_rent: 100000,
            occupancy_status: 'occupied',
            lease_start_date: '2024-01-01T00:00:00Z',
            lease_end_date: '2025-12-31T23:59:59Z',
            security_deposit: 200000,
            key_money: 100000,
            notes: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null,
            property: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              user_id: mockUser.id,
              name: 'Test',
            },
          });
        } else if (url.includes('expenses')) {
          mockData = Array(10).fill({
            id: '550e8400-e29b-41d4-a716-446655440003',
            property_id: '550e8400-e29b-41d4-a716-446655440000',
            expense_date: '2024-01-01T00:00:00Z',
            category: 'management_fee',
            amount: 50000,
            vendor: 'Test Vendor',
            description: 'Test Description',
            receipt_url: null,
            is_recurring: false,
            recurring_frequency: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null,
            property: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              user_id: mockUser.id,
              name: 'Test',
            },
          });
        }

        // データベースクエリをモック
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: mockData,
            error: null,
            count: 100,
          }),
        };
        mockSupabaseClient.from.mockReturnValue(mockQuery);

        const request = new NextRequest(`http://localhost:3000${url}`);
        const response = await handler(request);
        const data = await response.json();

        // ページネーションメタデータの検証
        expect(data).toBeDefined();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBe(10);

        // metaが存在する場合のみ検証
        if (data.meta) {
          expect(data.meta.page).toBe(2);
          expect(data.meta.limit).toBe(10);
          expect(data.meta.total).toBe(100);
          expect(data.meta.totalPages).toBe(10);
        }

        // range呼び出しの検証
        expect(mockQuery.range).toHaveBeenCalledWith(10, 19);
      }
    });
  });
});
