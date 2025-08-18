'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BaseLayout from './BaseLayout';
import { User, Lock, Bell, CreditCard } from 'lucide-react';
import { ToastProvider } from '@/components/ui/toast-context';
import ToastViewport from '@/components/ui/toast';

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

  return (
    <ToastProvider>
      <BaseLayout showSidebar={true}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary">設定</h1>
            <p className="mt-2 text-gray-600">アカウント設定とプリファレンスを管理</p>
          </div>

          <div className="flex gap-8">
            {/* Settings Sidebar */}
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
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </BaseLayout>
      <ToastViewport />
    </ToastProvider>
  );
}
