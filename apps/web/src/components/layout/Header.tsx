'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FontSizeSelector from '../ui/FontSizeSelector';

export default function Header({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: '物件一覧', href: '/properties' },
    { name: 'レントロール', href: '/rent-roll' },
    { name: '借入一覧', href: '/loans' },
  ];

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <header className="flex h-14 items-center justify-between bg-white px-6 shadow fixed top-0 left-0 right-0 z-40 md:relative md:z-auto">
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
        {/* Font Size Selector - デスクトップのみ表示 */}
        <FontSizeSelector className="hidden sm:flex" />

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
            {/* マイページボタン */}
            <Link href="/profile">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] px-3"
                aria-label="マイページ"
              >
                <User size={20} className="text-gray-600" />
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
          <nav className="flex flex-col p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-3 text-base font-medium min-h-[44px] flex items-center transition-colors ${
                  isActive(item.href) 
                    ? 'bg-primary text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

          </nav>
        </div>
      )}
    </header>
  );
}
