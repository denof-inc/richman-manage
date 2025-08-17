import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * サーバーコンポーネント用のSupabaseクライアントを作成
 * @returns Supabaseクライアント
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase環境変数が設定されていません');
  }

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Componentでは cookie の設定ができないため、エラーを無視
          // この処理は Route Handler や Server Action でのみ動作
        }
      },
    },
  });
}

/**
 * 現在のセッションを取得
 * @returns セッション情報またはnull
 */
export async function getSession() {
  const supabase = await createServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('セッション取得エラー:', error);
    return null;
  }

  return session;
}

/**
 * 現在のユーザー情報を取得
 * @returns ユーザー情報またはnull
 */
export async function getUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('ユーザー取得エラー:', error);
    return null;
  }

  return user;
}
