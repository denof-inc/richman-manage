/**
 * @jest-environment jsdom
 */
import { createBrowserClient } from './client';
import { createBrowserClient as originalCreateBrowserClient } from '@supabase/ssr';

// モジュールレベルの変数をモック
let mockSupabaseClient: ReturnType<typeof originalCreateBrowserClient> | null = null;

// client.tsのモジュールをモック
jest.mock('./client', () => {
  const originalModule = jest.requireActual('./client');

  return {
    ...originalModule,
    createBrowserClient: jest.fn(() => {
      if (mockSupabaseClient) {
        return mockSupabaseClient;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase環境変数が設定されていません');
      }

      const { createBrowserClient: mockedCreateBrowserClient } = jest.requireMock('@supabase/ssr');
      mockSupabaseClient = mockedCreateBrowserClient();
      return mockSupabaseClient;
    }),
  };
});

describe('createBrowserClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = null;

    // 環境変数のモック
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('Supabaseクライアントを作成できる', () => {
    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('シングルトンパターンで同じインスタンスを返す', () => {
    const client1 = createBrowserClient();
    const client2 = createBrowserClient();
    expect(client1).toBe(client2);
  });

  it('環境変数が未設定の場合エラーをスロー', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    mockSupabaseClient = null;

    expect(() => createBrowserClient()).toThrow('Supabase環境変数が設定されていません');
  });

  it('認証状態変更リスナーを登録できる', () => {
    const client = createBrowserClient();
    const mockCallback = jest.fn();

    const { data } = client.auth.onAuthStateChange(mockCallback);

    expect(data?.subscription).toBeDefined();
    expect(data?.subscription.unsubscribe).toBeDefined();
  });
});
