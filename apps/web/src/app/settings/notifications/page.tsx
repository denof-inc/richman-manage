'use client';

import { useState } from 'react';
import SettingsLayout from '@/components/layout/SettingsLayout';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import Spinner from '@/components/ui/Spinner';

export default function NotificationsSettingsPage() {
  const { toast } = useToast();

  // メール通知設定用
  const [emailNotifications, setEmailNotifications] = useState({
    monthlyReport: true,
    paymentReminders: true,
    securityAlerts: true,
    propertyUpdates: false,
    marketingEmails: false,
  });
  const [updatingSettings, setUpdatingSettings] = useState<string | null>(null);

  // メール通知設定更新
  const handleUpdateNotifications = async (
    key: keyof typeof emailNotifications,
    value: boolean
  ) => {
    setUpdatingSettings(key);
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
    } finally {
      setUpdatingSettings(null);
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">メール通知設定</h2>
          <p className="mt-1 text-sm text-gray-600">受け取るメール通知の種類を設定できます</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>重要な通知</CardTitle>
            <CardDescription>セキュリティやビジネスに関する重要な通知です</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="securityAlerts">セキュリティアラート</Label>
                <p className="text-sm text-gray-600">不審なログインやセキュリティ関連の通知</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="securityAlerts"
                  checked={emailNotifications.securityAlerts}
                  onCheckedChange={(checked) =>
                    handleUpdateNotifications('securityAlerts', checked)
                  }
                  disabled={updatingSettings === 'securityAlerts'}
                />
                {updatingSettings === 'securityAlerts' && <Spinner size="sm" />}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="paymentReminders">支払いリマインダー</Label>
                <p className="text-sm text-gray-600">借入返済や税金の支払い期限通知</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="paymentReminders"
                  checked={emailNotifications.paymentReminders}
                  onCheckedChange={(checked) =>
                    handleUpdateNotifications('paymentReminders', checked)
                  }
                  disabled={updatingSettings === 'paymentReminders'}
                />
                {updatingSettings === 'paymentReminders' && <Spinner size="sm" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>レポート通知</CardTitle>
            <CardDescription>定期的なレポートや分析情報の通知です</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="monthlyReport">月次レポート</Label>
                <p className="text-sm text-gray-600">毎月の収支レポートをメールで受け取る</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="monthlyReport"
                  checked={emailNotifications.monthlyReport}
                  onCheckedChange={(checked) => handleUpdateNotifications('monthlyReport', checked)}
                  disabled={updatingSettings === 'monthlyReport'}
                />
                {updatingSettings === 'monthlyReport' && <Spinner size="sm" />}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="propertyUpdates">物件情報更新</Label>
                <p className="text-sm text-gray-600">物件の価値変動や市場情報の更新通知</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="propertyUpdates"
                  checked={emailNotifications.propertyUpdates}
                  onCheckedChange={(checked) =>
                    handleUpdateNotifications('propertyUpdates', checked)
                  }
                  disabled={updatingSettings === 'propertyUpdates'}
                />
                {updatingSettings === 'propertyUpdates' && <Spinner size="sm" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>その他の通知</CardTitle>
            <CardDescription>サービス情報やマーケティングに関する通知です</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="marketingEmails">マーケティングメール</Label>
                <p className="text-sm text-gray-600">新機能の案内やお得な情報の通知</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="marketingEmails"
                  checked={emailNotifications.marketingEmails}
                  onCheckedChange={(checked) =>
                    handleUpdateNotifications('marketingEmails', checked)
                  }
                  disabled={updatingSettings === 'marketingEmails'}
                />
                {updatingSettings === 'marketingEmails' && <Spinner size="sm" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>通知設定について</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• セキュリティアラートは重要なため、無効にすることはお勧めしません</p>
              <p>• 支払いリマインダーは期限を忘れないために有効にすることをお勧めします</p>
              <p>• 設定変更は即座に反映されます</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
