'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SettingsLayout from '@/components/layout/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // ユーザー名変更用
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // ユーザー名更新
  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      toast({
        title: 'エラー',
        description: 'ユーザー名を入力してください',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingName(true);
    try {
      // TODO: Supabase Auth API での更新処理
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 仮実装

      toast({
        title: '更新完了',
        description: 'ユーザー名を更新しました',
      });
    } catch {
      toast({
        title: 'エラー',
        description: 'ユーザー名の更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">プロフィール</h2>
          <p className="mt-1 text-sm text-gray-600">表示名とアカウント情報を管理できます</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>アカウントの基本情報を確認・変更できます</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-gray-500">
                メールアドレスの変更はサポートまでご連絡ください
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">表示名</Label>
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="表示名を入力"
                />
                <Button onClick={handleUpdateDisplayName} disabled={isUpdatingName}>
                  {isUpdatingName ? '更新中...' : '更新'}
                </Button>
              </div>
              <p className="text-sm text-gray-500">この名前はアプリ内で表示される名前です</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>アカウント情報</CardTitle>
            <CardDescription>アカウントの詳細情報</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">アカウント作成日</Label>
                <p className="text-sm text-gray-900">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('ja-JP')
                    : '不明'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">最終ログイン</Label>
                <p className="text-sm text-gray-900">
                  {user?.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('ja-JP')
                    : '不明'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
