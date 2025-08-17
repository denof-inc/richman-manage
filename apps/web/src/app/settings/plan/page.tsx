'use client';

import { useState } from 'react';
import SettingsLayout from '@/components/layout/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Zap } from 'lucide-react';

export default function PlanSettingsPage() {
  const { toast } = useToast();

  // プラン情報（Stripe連携予定）
  const [currentPlan] = useState({
    id: 'basic',
    name: 'ベーシックプラン',
    price: '¥2,980/月',
    status: 'アクティブ',
    nextBilling: '2024-09-17',
  });

  const plans = [
    {
      id: 'basic',
      name: 'ベーシック',
      price: '¥2,980',
      period: '月',
      description: '個人投資家向けの基本プラン',
      features: ['物件管理 最大5件', '基本的な収支管理', 'メールサポート', '月次レポート'],
      icon: Check,
      popular: false,
    },
    {
      id: 'professional',
      name: 'プロフェッショナル',
      price: '¥9,800',
      period: '月',
      description: '本格的な不動産投資家向け',
      features: [
        '物件管理 無制限',
        '高度な分析・レポート',
        '税務計算サポート',
        '優先サポート',
        'API アクセス',
      ],
      icon: Crown,
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'エンタープライズ',
      price: '¥29,800',
      period: '月',
      description: '法人・大規模投資家向け',
      features: [
        '全機能無制限',
        'カスタムレポート',
        '専任サポート',
        'チーム管理機能',
        'カスタム統合',
      ],
      icon: Zap,
      popular: false,
    },
  ];

  const handlePlanChange = async (planId: string) => {
    try {
      // TODO: Stripe決済処理
      console.log('プラン変更:', planId);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 仮実装

      toast({
        title: 'プラン変更を開始',
        description: '決済ページに移動します',
      });
    } catch {
      toast({
        title: 'エラー',
        description: 'プラン変更に失敗しました',
        variant: 'destructive',
      });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      // TODO: サブスクリプション解約処理
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 仮実装

      toast({
        title: '解約手続き完了',
        description: '次回更新日で解約されます',
      });
    } catch {
      toast({
        title: 'エラー',
        description: '解約手続きに失敗しました',
        variant: 'destructive',
      });
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">プラン管理</h2>
          <p className="mt-1 text-sm text-gray-600">
            現在のプランを確認し、必要に応じてアップグレードできます
          </p>
        </div>

        {/* 現在のプラン */}
        <Card>
          <CardHeader>
            <CardTitle>現在のプラン</CardTitle>
            <CardDescription>アクティブなサブスクリプション情報</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{currentPlan.name}</h3>
                <p className="text-sm text-gray-600">{currentPlan.price}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  {currentPlan.status}
                </span>
                <p className="mt-1 text-sm text-gray-600">次回請求: {currentPlan.nextBilling}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* プラン一覧 */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">利用可能なプラン</h3>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = plan.id === currentPlan.id;

              return (
                <Card
                  key={plan.id}
                  className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                        人気プラン
                      </span>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {plan.price}
                      <span className="text-base font-normal text-gray-600">/{plan.period}</span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handlePlanChange(plan.id)}
                      disabled={isCurrentPlan}
                      variant={isCurrentPlan ? 'outline' : 'primary'}
                      className="w-full"
                    >
                      {isCurrentPlan ? '現在のプラン' : `${plan.name}に変更`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 解約・請求履歴 */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>請求履歴</CardTitle>
              <CardDescription>過去の請求情報を確認できます</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                請求履歴を表示
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>サブスクリプション解約</CardTitle>
              <CardDescription>サブスクリプションを解約できます</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full" onClick={handleCancelSubscription}>
                解約手続きを開始
              </Button>
              <p className="mt-2 text-xs text-gray-500">
                解約後も次回更新日まではサービスをご利用いただけます
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SettingsLayout>
  );
}
