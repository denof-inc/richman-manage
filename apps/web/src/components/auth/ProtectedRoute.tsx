'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true);
      router.replace('/login');

      // フォールバック: 2秒後に強制リダイレクト
      const fallbackTimer = setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 2000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [user, loading, router, redirecting]);

  // ローディング中
  if (loading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-gray-600">認証情報を確認しています...</p>
          </div>
        </div>
      )
    );
  }

  // 未認証時のリダイレクト処理中
  if (!user) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-gray-600">ログイン画面に移動しています...</p>
          </div>
        </div>
      )
    );
  }

  // 認証済みの場合は子コンポーネントを表示
  return <>{children}</>;
}
