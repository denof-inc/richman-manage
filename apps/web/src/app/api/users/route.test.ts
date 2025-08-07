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

describe('Users API - GET /api/users', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - ユーザー一覧取得', () => {
    it('認証済みユーザーがユーザー一覧を取得できる', async () => {
      // モックデータ
      const mockUsers = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'user1@example.com',
          name: 'User One',
          role: 'owner',
          timezone: 'Asia/Tokyo',
          language: 'ja',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          email: 'user2@example.com',
          name: 'User Two',
          role: 'viewer',
          timezone: 'Asia/Tokyo',
          language: 'ja',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id', email: 'auth@example.com' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
          count: 2,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/users');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUsers);
    });

    it('未認証ユーザーが401エラーを受け取る', async () => {
      // 認証失敗をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/users');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(response.status).toBe(401);
    });

    it('ページネーションパラメータが正しく処理される', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 50,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // リクエストを作成（ページネーションパラメータ付き）
      const request = new NextRequest('http://localhost:3000/api/users?page=2&limit=20');

      // APIを呼び出し
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(mockQuery.range).toHaveBeenCalledWith(20, 39); // page=2, limit=20
      expect(data.meta).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
    });

    it('検索クエリでフィルタリングできる', async () => {
      // 認証をモック
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      // データベースクエリをモック
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
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
      const request = new NextRequest('http://localhost:3000/api/users?search=john');

      // APIを呼び出し
      await GET(request);

      // アサーション
      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%john%');
    });
  });

  describe('POST - ユーザー作成', () => {
    it('有効なデータで新規ユーザーを作成できる', async () => {
      const newUserData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'Password123',
        role: 'viewer',
      };

      const createdUser = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: newUserData.email,
        name: newUserData.name,
        role: newUserData.role,
        timezone: 'Asia/Tokyo',
        language: 'ja',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      };

      // 認証をモック（管理者）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id', user_metadata: { role: 'admin' } } },
        error: null,
      });

      // 管理者権限チェックのモック
      const mockAdminQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };

      // ユーザー作成をモック
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: createdUser.id } },
        error: null,
      });

      // データベース挿入をモック
      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdUser,
          error: null,
        }),
      };

      // fromを2回呼ぶ：1回目は権限チェック、2回目はユーザー作成
      mockSupabaseClient.from.mockReturnValueOnce(mockAdminQuery).mockReturnValueOnce(mockInsert);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(newUserData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe(newUserData.email);
      expect(data.data.name).toBe(newUserData.name);
    });

    it('無効なメールアドレスでバリデーションエラーを返す', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'Password123',
      };

      // 認証をモック（管理者）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id', user_metadata: { role: 'admin' } } },
        error: null,
      });

      // 管理者権限チェックのモック
      const mockAdminQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockAdminQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidUserData),
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

    it('弱いパスワードでバリデーションエラーを返す', async () => {
      const weakPasswordData = {
        email: 'user@example.com',
        name: 'Test User',
        password: 'weak', // 短すぎる、大文字・数字なし
      };

      // 認証をモック（管理者）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id', user_metadata: { role: 'admin' } } },
        error: null,
      });

      // 管理者権限チェックのモック
      const mockAdminQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockAdminQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(weakPasswordData),
        headers: { 'Content-Type': 'application/json' },
      });

      // APIを呼び出し
      const response = await POST(request);
      const data = await response.json();

      // アサーション
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      // detailsは配列なので、メッセージを確認
      const errorMessages = data.error.details.map((d: { message: string }) => d.message).join(' ');
      expect(errorMessages).toContain('パスワード');
    });

    it('非管理者ユーザーが403エラーを受け取る', async () => {
      const newUserData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'Password123',
      };

      // 認証をモック（非管理者）
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id', user_metadata: { role: 'viewer' } } },
        error: null,
      });

      // 非管理者権限チェックのモック
      const mockViewerQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'viewer' },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockViewerQuery);

      // リクエストを作成
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(newUserData),
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
