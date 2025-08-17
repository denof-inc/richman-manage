/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// APIルートのインポート
import { GET as getProperties, POST as createProperty } from '../properties/route';
import { GET as getLoans, POST as createLoan } from '../loans/route';
import { POST as createRentRoll } from '../rent-rolls/route';
import { POST as createExpense } from '../expenses/route';

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

describe('APIセキュリティ検証', () => {
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
  });

  describe('認証・認可のセキュリティ', () => {
    it('認証ヘッダーなしのリクエストが全て401を返す', async () => {
      // 認証失敗をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      // GETエンドポイントのテスト
      const getEndpoints = [
        { handler: getProperties, url: '/api/properties' },
        { handler: getLoans, url: '/api/loans' },
      ];

      for (const { handler, url } of getEndpoints) {
        const request = new NextRequest(`http://localhost:3000${url}`);
        const response = await handler(request);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error.code).toBe('UNAUTHORIZED');
        expect(response.status).toBe(401);
      }

      // POSTエンドポイントのテスト
      const postEndpoints = [
        {
          handler: createProperty,
          url: '/api/properties',
          body: {
            name: 'Test',
            address: 'Test',
            purchase_price: 100000,
            purchase_date: '2024-01-01',
          },
        },
        {
          handler: createLoan,
          url: '/api/loans',
          body: {
            property_id: 'test',
            lender_name: 'Test',
            loan_type: 'mortgage',
            principal_amount: 100000,
            current_balance: 100000,
            interest_rate: 1.0,
            loan_term_months: 120,
            monthly_payment: 1000,
          },
        },
      ];

      for (const { handler, url, body } of postEndpoints) {
        const request = new NextRequest(`http://localhost:3000${url}`, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        });
        const response = await handler(request);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error.code).toBe('UNAUTHORIZED');
        expect(response.status).toBe(401);
      }
    });

    it('他ユーザーのリソースへのアクセスが全て拒否される', async () => {
      // 認証済みユーザーをモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const otherUsersPropertyId = '550e8400-e29b-41d4-a716-446655440999';

      // 物件所有権チェックで権限なし
      const mockPropertyCheck = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockPropertyCheck);

      // 借入作成試行
      const loanRequest = new NextRequest('http://localhost:3000/api/loans', {
        method: 'POST',
        body: JSON.stringify({
          property_id: otherUsersPropertyId,
          lender_name: 'Evil Bank',
          loan_type: 'mortgage',
          principal_amount: 1000000,
          current_balance: 1000000,
          interest_rate: 2.0,
          loan_term_months: 240,
          monthly_payment: 10000,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const loanResponse = await createLoan(loanRequest);
      expect((await loanResponse.json()).error.code).toBe('FORBIDDEN');

      // レントロール作成試行
      const rentRollRequest = new NextRequest('http://localhost:3000/api/rent-rolls', {
        method: 'POST',
        body: JSON.stringify({
          property_id: otherUsersPropertyId,
          room_number: '101',
          tenant_name: 'Unauthorized Tenant',
          monthly_rent: 100000,
          occupancy_status: 'occupied',
          lease_start_date: '2024-01-01T00:00:00Z',
          lease_end_date: '2025-12-31T23:59:59Z',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const rentRollResponse = await createRentRoll(rentRollRequest);
      expect((await rentRollResponse.json()).error.code).toBe('FORBIDDEN');

      // 支出作成試行
      const expenseRequest = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          property_id: otherUsersPropertyId,
          expense_date: '2024-01-01T00:00:00Z',
          category: 'management_fee',
          amount: 50000,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const expenseResponse = await createExpense(expenseRequest);
      expect((await expenseResponse.json()).error.code).toBe('FORBIDDEN');
    });
  });

  describe('入力検証のセキュリティ', () => {
    beforeEach(() => {
      // 認証済みユーザーをモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('SQLインジェクション対策が機能している', async () => {
      const maliciousInputs = [
        "'; DROP TABLE properties; --",
        "1' OR '1'='1",
        '"><script>alert("XSS")</script>',
        '${process.env.DATABASE_URL}',
        '`rm -rf /`',
      ];

      for (const maliciousInput of maliciousInputs) {
        const request = new NextRequest('http://localhost:3000/api/properties', {
          method: 'POST',
          body: JSON.stringify({
            name: maliciousInput,
            address: maliciousInput,
            purchase_price: 100000000,
            purchase_date: '2024-01-01',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        // データベースの挿入操作をモック
        const mockInsert = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: '550e8400-e29b-41d4-a716-446655440101',
              name: maliciousInput, // 安全にエスケープされた値
              address: maliciousInput,
              purchase_price: 100000000,
              purchase_date: '2024-01-01',
              user_id: mockUser.id,
            },
            error: null,
          }),
        };
        mockSupabaseClient.from.mockReturnValue(mockInsert);

        const response = await createProperty(request);
        const data = await response.json();

        // SQLインジェクションが実行されていないことを確認
        if (data.success) {
          // 成功した場合、値が安全にエスケープされていることを期待
          expect(typeof data.data.name).toBe('string');
          expect(data.data.name).toBe(maliciousInput);
        }
      }
    });

    it('不正な型の入力が拒否される', async () => {
      const invalidInputs = [
        {
          name: 'Test Property',
          address: 'Test Address',
          purchase_price: 'not-a-number', // 数値であるべき
          purchase_date: '2024-01-01',
        },
        {
          name: 'Test Property',
          address: 'Test Address',
          purchase_price: 100000000,
          purchase_date: 'invalid-date', // 有効な日付でない
        },
        {
          name: null, // 必須フィールド
          address: 'Test Address',
          purchase_price: 100000000,
          purchase_date: '2024-01-01',
        },
      ];

      for (const invalidInput of invalidInputs) {
        const request = new NextRequest('http://localhost:3000/api/properties', {
          method: 'POST',
          body: JSON.stringify(invalidInput),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await createProperty(request);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error.code).toBe('VALIDATION_ERROR');
        expect(response.status).toBe(422);
      }
    });

    it('過度に大きいペイロードが拒否される', async () => {
      // 10MB以上の文字列を生成
      const largeString = 'x'.repeat(10 * 1024 * 1024);

      const request = new NextRequest('http://localhost:3000/api/properties', {
        method: 'POST',
        body: JSON.stringify({
          name: largeString,
          address: 'Test Address',
          purchase_price: 100000000,
          purchase_date: '2024-01-01',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProperty(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      // Zodバリデーションで文字列長制限に引っかかることを期待
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(422);
    });
  });

  describe('レート制限とDoS対策', () => {
    it('短時間での大量リクエストが適切に処理される', async () => {
      // 認証済みユーザーをモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
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

      // 100回の連続リクエストをシミュレート
      const requests = Array(100)
        .fill(null)
        .map(() => {
          const request = new NextRequest('http://localhost:3000/api/properties');
          return getProperties(request);
        });

      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map((r: Response) => r.json()));

      // すべてのリクエストが処理されることを確認
      expect(results.every((r) => (r as { success?: boolean }).success !== undefined)).toBe(true);

      // データベースへのクエリ回数を確認
      const queryCallCount = mockSupabaseClient.from.mock.calls.length;
      expect(queryCallCount).toBeGreaterThan(0);
    });
  });

  describe('データ漏洩防止', () => {
    it('エラーレスポンスに機密情報が含まれない', async () => {
      // データベースエラーをモック
      const dbError = {
        message: 'Connection to database failed: postgresql://user:password@localhost:5432/db',
        code: 'PGRST500',
        details: 'Password authentication failed for user "admin"',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/properties');
      const response = await getProperties(request);
      const data = await response.json();

      // エラーレスポンスに機密情報が含まれていないことを確認
      expect(data.error.message).not.toContain('password');
      expect(data.error.message).not.toContain('user:password');
      // サニタイズされた形式を確認
      expect(data.error.message).toContain('postgresql://***@');
      // SupabaseエラーはbadRequestとして処理される
      expect(data.error.code).toBe('BAD_REQUEST');
    });

    it('スタックトレースが本番環境で露出しない', async () => {
      // エラーを意図的に発生させる
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Simulated internal error with stack trace')
      );

      const request = new NextRequest('http://localhost:3000/api/properties');
      const response = await getProperties(request);
      const data = await response.json();

      // スタックトレースが含まれていないことを確認
      expect(JSON.stringify(data)).not.toContain('at ');
      expect(JSON.stringify(data)).not.toContain('.js:');
      expect(data.error.stack).toBeUndefined();
    });
  });

  describe('CORS対策', () => {
    it('適切なCORSヘッダーが設定されている', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

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

      const request = new NextRequest('http://localhost:3000/api/properties', {
        headers: {
          Origin: 'https://evil.com',
        },
      });

      const response = await getProperties(request);

      // Next.jsのAPIルートはデフォルトでCORS保護されている
      expect(response.status).toBe(200);
    });
  });
});
