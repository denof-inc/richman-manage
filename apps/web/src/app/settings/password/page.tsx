'use client';

import { useState } from 'react';
import SettingsLayout from '@/components/layout/SettingsLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import LoadingButton from '@/components/ui/LoadingButton';

export default function PasswordSettingsPage() {
  const { toast } = useToast();

  // パスワード変更用
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // パスワード変更
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'エラー',
        description: '全ての項目を入力してください',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'エラー',
        description: '新しいパスワードが一致しません',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'エラー',
        description: 'パスワードは8文字以上で入力してください',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // TODO: Supabase Auth API でのパスワード変更処理
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 仮実装

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: '更新完了',
        description: 'パスワードを変更しました',
      });
    } catch {
      toast({
        title: 'エラー',
        description: 'パスワードの変更に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">パスワード変更</h2>
          <p className="mt-1 text-sm text-gray-600">
            セキュリティのため、定期的にパスワードを変更することをお勧めします
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>新しいパスワード</CardTitle>
            <CardDescription>現在のパスワードと新しいパスワードを入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">現在のパスワード</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在のパスワードを入力"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新しいパスワード</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8文字以上で入力"
              />
              <p className="text-sm text-gray-500">
                パスワードは8文字以上で、大文字・小文字・数字を含めることをお勧めします
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="新しいパスワードを再入力"
              />
            </div>

            <LoadingButton
              onClick={handleChangePassword}
              loading={isUpdatingPassword}
              loadingText="パスワード変更中..."
              className="w-full"
            >
              パスワードを変更
            </LoadingButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>パスワードのセキュリティ</CardTitle>
            <CardDescription>パスワードを安全に保つためのヒント</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• 8文字以上の長さにする</li>
              <li>• 大文字と小文字を組み合わせる</li>
              <li>• 数字と記号を含める</li>
              <li>• 他のサービスと同じパスワードを使わない</li>
              <li>• 定期的にパスワードを変更する</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
