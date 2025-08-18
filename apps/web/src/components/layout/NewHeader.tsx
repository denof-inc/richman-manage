'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { HelpCircle, Settings, ChevronDown, User, Mail, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import FontSizeSelector from '../ui/FontSizeSelector';

interface NewHeaderProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export default function NewHeader({ onMobileMenuToggle, isMobileMenuOpen }: NewHeaderProps = {}) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!user;

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsDropdownOpen(false);
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
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-primary">
            リッチマンManage
          </Link>
        </div>

        {/* Right: Help + Settings (Logged in) or Login buttons (Logged out) + Mobile menu */}
        <div className="flex items-center space-x-4">
          {!isLoggedIn ? (
            // 未ログイン時: ログインボタン
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
            // ログイン済み時: ヘルプ + 設定ドロップダウン + モバイルメニュー
            <>
              {/* Help Link - Desktop only */}
              <Link
                href="/help"
                className="hidden items-center space-x-1 text-sm text-gray-600 transition-colors hover:text-gray-900 lg:flex"
              >
                <HelpCircle size={16} />
                <span>ヘルプ</span>
              </Link>

              {/* Settings Dropdown - Desktop only */}
              <div className="relative hidden lg:block" ref={dropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2"
                  aria-label="ユーザーメニュー"
                >
                  <Settings size={16} />
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </Button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                    {/* User Info Section */}
                    <div className="border-b border-gray-100 px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {user?.user_metadata?.display_name || 'ユーザー'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-2">
                        <Mail size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{user?.email}</span>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* Settings Link */}
                      <Link
                        href="/settings/profile"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Settings size={16} />
                        <span>設定</span>
                      </Link>

                      {/* Font Size Adjustment */}
                      <div className="border-t border-gray-100 px-4 py-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                          表示設定
                        </p>
                        <FontSizeSelector />
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-2">
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut size={16} />
                          <span>ログアウト</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onMobileMenuToggle}
                className="lg:hidden"
                aria-label="メニュー"
              >
                {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
