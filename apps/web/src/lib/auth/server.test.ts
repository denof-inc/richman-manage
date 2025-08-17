import { createServerClient, getSession, getUser } from './server';
import { createServerClient as mockCreateServerClient } from '@supabase/ssr';

jest.mock('@supabase/ssr');

describe('createServerClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 環境変数のモック
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('Supabaseクライアントを作成できる', async () => {
    const client = await createServerClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('環境変数が未設定の場合エラーをスロー', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(createServerClient()).rejects.toThrow('Supabase環境変数が設定されていません');
  });
});

describe('getSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('セッションがない場合nullを返す', async () => {
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('セッション取得時のエラーをハンドリング', async () => {
    const mockError = new Error('Session error');
    (mockCreateServerClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: mockError })),
      },
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const session = await getSession();

    expect(session).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('セッション取得エラー:', mockError);

    consoleSpy.mockRestore();
  });
});

describe('getUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    // モックをリセットしてgetUserメソッドを追加
    (mockCreateServerClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      },
    });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('ユーザーがいない場合nullを返す', async () => {
    const user = await getUser();
    expect(user).toBeNull();
  });

  it('ユーザー取得時のエラーをハンドリング', async () => {
    const mockError = new Error('User error');
    (mockCreateServerClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: mockError })),
      },
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const user = await getUser();

    expect(user).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('ユーザー取得エラー:', mockError);

    consoleSpy.mockRestore();
  });
});
