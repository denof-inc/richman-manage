'use client';

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * ブラウザ（クライアントコンポーネント）用のSupabaseクライアントを作成
 * シングルトンパターンで実装
 * @returns Supabaseクライアント
 */
export function createBrowserClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase環境変数が設定されていません');
  }

  supabaseClient = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);

  return supabaseClient;
}
