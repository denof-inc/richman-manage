'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, User, LogOut } from 'lucide-react';
import { Button } from '@richman/ui';
import FontSizeSelector from '../ui/FontSizeSelector';

type Owner = {
  id: string;
  name: string;
};

export default function Header({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [owners] = useState<Owner[]>([
    { id: '1', name: '個人所有' },
    { id: '2', name: '法人所有' },
  ]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('1');

  const navItems = [
    { name: '物件一覧', href: '/properties' },
    { name: 'レントロール', href: '/rent-roll' },
    { name: '借入一覧', href: '/loans' },
  ];

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <header className="flex h-14 items-center justify-between bg-white px-6 shadow">
      <div className="flex items-center">
        <Link href="/" className="mr-8 text-xl font-bold text-primary">
          リッチマンManage
        </Link>

        {/* Desktop Navigation - ログイン済み時のみ表示 */}
        {isLoggedIn && (
          <nav className="hidden space-x-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Font Size Selector - 常に表示 */}
        <FontSizeSelector className="hidden sm:flex" />

        {/* Owner Selector - ログイン済み時のみ表示 */}
        {isLoggedIn && (
          <div className="hidden items-center md:flex">
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 未ログイン時はログインボタンを表示 */}
        {!isLoggedIn ? (
          <div className="flex items-center space-x-2">
            <Link href="/login">
              <Button variant="outline" size="sm">
                ログイン
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">新規登録</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* User Avatar */}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full p-1"
              aria-label="ユーザー設定"
            >
              <User size={20} className="text-gray-600" />
            </Button>

            {/* Logout button */}
            <Link href="/login">
              <Button variant="ghost" size="sm" aria-label="ログアウト">
                <LogOut size={20} className="text-gray-600" />
              </Button>
            </Link>
          </>
        )}

        {/* Mobile Menu Button - ログイン済み時のみ表示 */}
        {isLoggedIn && (
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="メニュー"
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-gray-600" />
            ) : (
              <Menu size={24} className="text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Mobile Menu - ログイン済み時のみ表示 */}
      {isLoggedIn && mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-14 z-50 bg-white shadow-md md:hidden">
          <nav className="flex flex-col p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`py-2 text-sm font-medium ${
                  isActive(item.href) ? 'text-primary' : 'text-gray-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="mt-2 border-t py-2">
              <label className="mb-1 block text-sm text-gray-500">文字サイズ</label>
              <FontSizeSelector className="mb-3" showLabel={false} />

              <label className="mb-1 block text-sm text-gray-500">所有者</label>
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                className="w-full rounded border px-2 py-1 text-sm"
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
