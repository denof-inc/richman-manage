'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/auth/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    console.log('🔐 AuthProvider: 初期化開始');

    // 初期セッション取得
    const getInitialSession = async () => {
      try {
        console.log('🔐 AuthProvider: セッション取得中...');
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log('🔐 AuthProvider: セッション取得結果', {
          hasSession: !!session,
          hasUser: !!session?.user,
          error: error?.message,
        });

        if (error) {
          console.error('🔐 AuthProvider: セッション取得エラー:', error);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('🔐 AuthProvider: 予期しないセッション取得エラー:', error);
        setUser(null);
      } finally {
        setLoading(false);
        console.log('🔐 AuthProvider: 初期セッション取得完了');
      }
    };

    getInitialSession();

    // 認証状態変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 AuthProvider: 認証状態変更', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
      });

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('🔐 AuthProvider: クリーンアップ');
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // デバッグ用: 認証状態の変更を監視
  useEffect(() => {
    console.log('🔐 AuthProvider: 状態変更', {
      hasUser: !!user,
      loading,
      userId: user?.id,
    });
  }, [user, loading]);

  const signOut = async () => {
    try {
      console.log('🔐 AuthProvider: ログアウト開始');
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🔐 AuthProvider: ログアウトエラー:', error);
        throw error;
      }
      console.log('🔐 AuthProvider: ログアウト完了');
    } catch (error) {
      console.error('🔐 AuthProvider: 予期しないログアウトエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
