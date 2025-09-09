/**
 * @jest-environment node
 */
import { GET, POST } from './route';
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

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

describe('Owners API', () => {
  const mockSupabaseClient = {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('GET /api/owners', () => {
    it('認証済みユーザーの所有者一覧を返す', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              user_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'デフォルト所有者',
              owner_kind: 'individual',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              deleted_at: null,
            },
          ],
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const res = await GET();
      const body = await res.json();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('owners');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', '550e8400-e29b-41d4-a716-446655440000');
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data[0].name).toBe('デフォルト所有者');
    });

    it('未認証は401を返す', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'x' },
      });
      const res = await GET();
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/owners', () => {
    it('有効な入力で所有者を作成できる', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
        error: null,
      });

      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            name: '法人A',
            owner_kind: 'corporation',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            deleted_at: null,
          },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockInsert);

      const req = new NextRequest('http://localhost:3000/api/owners', {
        method: 'POST',
        body: JSON.stringify({ name: '法人A', owner_kind: 'corporation' }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('owners');
      expect(res.status).toBe(201);
      expect(body.data.name).toBe('法人A');
    });

    it('バリデーションエラー時に422を返す', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'u-123' } },
        error: null,
      });
      const req = new NextRequest('http://localhost:3000/api/owners', {
        method: 'POST',
        body: '{}' as unknown as BodyInit,
      });
      const res = await POST(req);
      expect(res.status).toBe(422);
    });
  });
});
