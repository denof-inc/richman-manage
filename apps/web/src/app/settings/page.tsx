'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SettingsLayout from '@/components/layout/SettingsLayout';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // デフォルトでプロフィールページにリダイレクト
    router.replace('/settings/profile');
  }, [router]);

  return (
    <SettingsLayout>
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">プロフィール設定にリダイレクトしています...</p>
      </div>
    </SettingsLayout>
  );
}
