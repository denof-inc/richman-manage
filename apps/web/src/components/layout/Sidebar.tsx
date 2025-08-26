'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building, Receipt, CreditCard, TrendingDown, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const mainNavItems = [
  {
    name: 'ダッシュボード',
    href: '/',
    icon: Home,
  },
  {
    name: '物件一覧',
    href: '/properties',
    icon: Building,
  },
  {
    name: 'レントロール',
    href: '/rent-roll',
    icon: Receipt,
  },
  {
    name: '借入一覧',
    href: '/loans',
    icon: CreditCard,
  },
  {
    name: '支出一覧',
    href: '/expenses',
    icon: TrendingDown,
  },
];

const analyticsNavItems = [
  {
    name: 'キャッシュフロー分析',
    href: '/cashflow',
    icon: BarChart3,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isLoggedIn = !!user;

  // ログインしていない場合はサイドバーを表示しない
  if (!isLoggedIn) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <aside
      className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:block lg:translate-x-0`}
    >
      <nav className="relative h-full overflow-y-auto px-4 py-6 pb-32">
        {/* Main Navigation */}
        <div className="mb-8">
          <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            メイン
          </h3>
          <ul className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-white' : 'text-gray-400'} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Analytics Navigation */}
        <div className="mb-8">
          <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            分析
          </h3>
          <ul className="space-y-1">
            {analyticsNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-white' : 'text-gray-400'} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Help Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            サポート
          </h3>
          <ul className="space-y-1">
            <li>
              <Link
                href="/help"
                onClick={onClose}
                className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <span>ヘルプ</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Footer Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-600">リッチマンManage v1.0</p>
            <p className="mt-1 text-xs text-gray-500">不動産投資管理ツール</p>
          </div>
        </div>
      </nav>
    </aside>
  );
}
