'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // ローディング中または未認証時のリダイレクト処理中
  if (loading || (!loading && !user)) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-gray-600">
              {loading ? '認証情報を確認しています...' : 'ログイン画面に移動しています...'}
            </p>
          </div>
        </div>
      )
    );
  }

  // 認証済みの場合は子コンポーネントを表示
  return <>{children}</>;
}
