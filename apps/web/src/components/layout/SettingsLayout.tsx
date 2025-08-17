'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import MainLayout from './MainLayout';
import { User, Lock, Bell, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const settingsNavItems = [
  {
    href: '/settings/profile',
    label: 'プロフィール',
    icon: User,
  },
  {
    href: '/settings/password',
    label: 'パスワード変更',
    icon: Lock,
  },
  {
    href: '/settings/notifications',
    label: 'メール通知',
    icon: Bell,
  },
  {
    href: '/settings/plan',
    label: 'プラン管理',
    icon: CreditCard,
  },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'ログアウト完了',
        description: 'ログアウトしました',
      });
    } catch {
      toast({
        title: 'エラー',
        description: 'ログアウトに失敗しました',
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">設定</h1>
          <p className="mt-2 text-gray-600">アカウント設定とプリファレンスを管理</p>
        </div>

        <div className="flex gap-8">
          {/* サイドバー */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {settingsNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 ${
                      isActive
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}

              {/* ログアウト */}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={18} />
                ログアウト
              </button>
            </nav>
          </aside>

          {/* メインコンテンツ */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </MainLayout>
  );
}
