'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // ユーザー名変更用
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // パスワード変更用
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // メール通知設定用
  const [emailNotifications, setEmailNotifications] = useState({
    monthlyReport: true,
    paymentReminders: true,
    securityAlerts: true,
  });

  // プラン情報（Stripe連携予定）
  const [currentPlan] = useState({
    name: 'ベーシックプラン',
    price: '¥2,980/月',
    status: 'アクティブ',
    nextBilling: '2024-09-17',
  });

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

  // メール通知設定更新
  const handleUpdateNotifications = async (
    key: keyof typeof emailNotifications,
    value: boolean
  ) => {
    setEmailNotifications((prev) => ({ ...prev, [key]: value }));

    try {
      // TODO: バックエンドAPIでの通知設定更新
      await new Promise((resolve) => setTimeout(resolve, 500)); // 仮実装

      toast({
        title: '設定更新',
        description: 'メール通知設定を更新しました',
      });
    } catch {
      // 失敗時は元に戻す
      setEmailNotifications((prev) => ({ ...prev, [key]: !value }));
      toast({
        title: 'エラー',
        description: '設定の更新に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // ログアウト
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
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">設定</h1>
          <p className="mt-2 text-gray-600">アカウント設定とプリファレンスを管理</p>
        </div>

        <div className="space-y-6">
          {/* ユーザー名変更 */}
          <Card>
            <CardHeader>
              <CardTitle>プロフィール</CardTitle>
              <CardDescription>表示名とアカウント情報を管理</CardDescription>
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
              </div>
            </CardContent>
          </Card>

          {/* プラン確認 */}
          <Card>
            <CardHeader>
              <CardTitle>プラン</CardTitle>
              <CardDescription>現在のサブスクリプションプラン</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{currentPlan.name}</h3>
                  <p className="text-sm text-gray-600">{currentPlan.price}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    {currentPlan.status}
                  </span>
                  <p className="mt-1 text-sm text-gray-600">次回請求: {currentPlan.nextBilling}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                プランを変更
              </Button>
            </CardContent>
          </Card>

          {/* パスワード変更 */}
          <Card>
            <CardHeader>
              <CardTitle>パスワード変更</CardTitle>
              <CardDescription>
                セキュリティのため定期的にパスワードを変更してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">現在のパスワード</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={isUpdatingPassword}
                className="w-full"
              >
                {isUpdatingPassword ? 'パスワード変更中...' : 'パスワードを変更'}
              </Button>
            </CardContent>
          </Card>

          {/* メール通知設定 */}
          <Card>
            <CardHeader>
              <CardTitle>メール通知</CardTitle>
              <CardDescription>受け取るメール通知の種類を設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="monthlyReport">月次レポート</Label>
                  <p className="text-sm text-gray-600">毎月の収支レポートをメールで受け取る</p>
                </div>
                <Switch
                  id="monthlyReport"
                  checked={emailNotifications.monthlyReport}
                  onCheckedChange={(checked) => handleUpdateNotifications('monthlyReport', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="paymentReminders">支払いリマインダー</Label>
                  <p className="text-sm text-gray-600">借入返済や税金の支払い期限通知</p>
                </div>
                <Switch
                  id="paymentReminders"
                  checked={emailNotifications.paymentReminders}
                  onCheckedChange={(checked) =>
                    handleUpdateNotifications('paymentReminders', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="securityAlerts">セキュリティアラート</Label>
                  <p className="text-sm text-gray-600">不審なログインやセキュリティ関連の通知</p>
                </div>
                <Switch
                  id="securityAlerts"
                  checked={emailNotifications.securityAlerts}
                  onCheckedChange={(checked) =>
                    handleUpdateNotifications('securityAlerts', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* ログアウト */}
          <Card>
            <CardHeader>
              <CardTitle>アカウント</CardTitle>
              <CardDescription>アカウントの管理</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleSignOut} className="w-full">
                ログアウト
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
