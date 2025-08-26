'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, TrendingUp, TrendingDown, DollarSign, FileText, Download } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import { CashFlowData, CashFlowFilter, CashFlowPeriod, Property } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import CashFlowChart from '@/components/features/cashflow/CashFlowChart';

export default function CashFlowPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  // フィルター状態管理
  const [filter, setFilter] = useState<CashFlowFilter>({
    period_type: 'monthly',
    start_date: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)
      .toISOString()
      .split('T')[0], // 12ヶ月前から
    end_date: new Date().toISOString().split('T')[0], // 今日まで
    property_ids: undefined, // 全物件
  });

  // データ取得関数
  const loadCashFlowData = useCallback(async () => {
    setLoading(true);
    try {
      // APIからデータを取得
      const response = await fetch(
        `/api/cashflow?${new URLSearchParams({
          period_type: filter.period_type,
          start_date: filter.start_date,
          end_date: filter.end_date,
          ...(filter.property_ids && { property_ids: filter.property_ids.join(',') }),
        })}`
      );

      if (!response.ok) {
        throw new Error('データ取得に失敗しました');
      }

      const result = await response.json();
      if (result.success) {
        setCashFlowData(result.data);
      } else {
        throw new Error(result.error || 'データ取得に失敗しました');
      }
    } catch (error) {
      console.warn('API取得エラー、モックデータを使用:', error);

      // フォールバック：APIエラー時はモックデータを使用
      await new Promise((resolve) => setTimeout(resolve, 800)); // ローディング演出
      const mockData: CashFlowData[] = generateMockCashFlowData();
      setCashFlowData(mockData);

      toast({
        variant: 'destructive',
        title: 'API接続エラー',
        description: 'サンプルデータを表示しています',
      });
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  const loadProperties = useCallback(async () => {
    try {
      // TODO: API実装後に置換
      // const response = await fetch('/api/properties');
      // const data = await response.json();
      // setProperties(data.data || []);

      // 仮データ
      setProperties([
        { id: '1', name: '青山マンション', address: '東京都港区' } as Property,
        { id: '2', name: '渋谷アパート', address: '東京都渋谷区' } as Property,
      ]);
    } catch (error) {
      console.error('物件データの取得に失敗:', error);
    }
  }, []);

  useEffect(() => {
    loadProperties();
    loadCashFlowData();
  }, [loadProperties, loadCashFlowData]);

  // フィルター変更ハンドラー
  const handleFilterChange = (updates: Partial<CashFlowFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  };

  // 期間変更ハンドラー
  const handlePeriodChange = (period: CashFlowPeriod) => {
    handleFilterChange({ period_type: period });
  };

  // 物件選択変更ハンドラー（将来的に使用予定）
  // const handlePropertyChange = (propertyIds: string[]) => {
  //   handleFilterChange({ property_ids: propertyIds.length > 0 ? propertyIds : undefined });
  // };

  // KPI計算
  const totalIncome = cashFlowData.reduce(
    (sum, data) => sum + data.income.rent + data.income.other,
    0
  );
  const totalExpenses = cashFlowData.reduce(
    (sum, data) =>
      sum +
      data.expenses.loan_principal +
      data.expenses.loan_interest +
      data.expenses.management_fee +
      data.expenses.property_tax +
      data.expenses.repair_cost +
      data.expenses.utility +
      data.expenses.insurance +
      data.expenses.other_expenses,
    0
  );
  const netCashFlow = totalIncome - totalExpenses;
  const latestData = cashFlowData[cashFlowData.length - 1];

  return (
    <ProtectedRoute>
      <MainLayout>
        <LoadingOverlay loading={loading} text="キャッシュフローデータを読み込み中...">
          <div className="container mx-auto px-4 py-8">
            {/* ページヘッダー */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-primary">キャッシュフロー分析</h1>
              <p className="mt-2 text-text-muted">収支の推移と詳細分析</p>
            </div>

            {/* フィルター */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  分析条件
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* 期間タイプ選択 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">期間</label>
                    <Select value={filter.period_type} onValueChange={handlePeriodChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="期間を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">月次</SelectItem>
                        <SelectItem value="quarterly">四半期</SelectItem>
                        <SelectItem value="yearly">年次</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 開始日 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">開始日</label>
                    <input
                      type="date"
                      value={filter.start_date}
                      onChange={(e) => handleFilterChange({ start_date: e.target.value })}
                      className="w-full rounded border border-border-default px-3 py-2 text-sm"
                    />
                  </div>

                  {/* 終了日 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">終了日</label>
                    <input
                      type="date"
                      value={filter.end_date}
                      onChange={(e) => handleFilterChange({ end_date: e.target.value })}
                      className="w-full rounded border border-border-default px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* 物件選択（今後実装予定） */}
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium">対象物件</label>
                  <Select value="all" onValueChange={() => {}}>
                    <SelectTrigger>
                      <SelectValue placeholder="すべての物件" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべての物件</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={loadCashFlowData} className="bg-primary hover:bg-primary/90">
                    分析実行
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    CSV出力
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* KPIサマリーカード */}
            <div className="mb-8 grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">総収入</CardTitle>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(totalIncome)}
                  </div>
                  <p className="text-xs text-text-muted">期間合計</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">総支出</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(totalExpenses)}
                  </div>
                  <p className="text-xs text-text-muted">期間合計</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">
                    純キャッシュフロー
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-accent' : 'text-red-500'}`}
                  >
                    {formatCurrency(netCashFlow)}
                  </div>
                  <p className="text-xs text-text-muted">期間合計</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">
                    累計キャッシュフロー
                  </CardTitle>
                  <FileText className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${(latestData?.cumulative_cash_flow || 0) >= 0 ? 'text-accent' : 'text-red-500'}`}
                  >
                    {formatCurrency(latestData?.cumulative_cash_flow || 0)}
                  </div>
                  <p className="text-xs text-text-muted">累計</p>
                </CardContent>
              </Card>
            </div>

            {/* グラフエリア */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>収支推移とキャッシュフロー</CardTitle>
                  <p className="text-sm text-text-muted">
                    収入・支出の推移と累計キャッシュフローを表示しています
                  </p>
                </CardHeader>
                <CardContent>
                  <CashFlowChart
                    data={cashFlowData}
                    height={400}
                    showLegend={true}
                    showGrid={true}
                  />
                </CardContent>
              </Card>
            </div>

            {/* 詳細テーブル（次のステップで実装） */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>詳細データ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <p className="text-text-muted">詳細テーブル実装予定</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </LoadingOverlay>
      </MainLayout>
    </ProtectedRoute>
  );
}

// 仮データ生成関数（API実装後に削除）
function generateMockCashFlowData(): CashFlowData[] {
  const data: CashFlowData[] = [];
  const startDate = new Date(2024, 0, 1); // 2024年1月から

  for (let i = 0; i < 12; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const rent = 320000 + Math.floor(Math.random() * 50000); // 家賃収入のブレ
    const other = Math.floor(Math.random() * 20000); // その他収入

    const loanPrincipal = 150000;
    const loanInterest = 45000;
    const managementFee = 25000 + Math.floor(Math.random() * 10000);
    const propertyTax = i % 4 === 0 ? 80000 : 0; // 四半期ごと
    const repairCost = Math.floor(Math.random() * 30000);
    const utility = 8000 + Math.floor(Math.random() * 5000);
    const insurance = i === 0 ? 50000 : 0; // 年1回
    const otherExpenses = Math.floor(Math.random() * 15000);

    const totalIncome = rent + other;
    // const totalExpenses = loanPrincipal + loanInterest + managementFee + propertyTax + repairCost + utility + insurance + otherExpenses;
    const operatingProfit =
      totalIncome -
      (managementFee + propertyTax + repairCost + utility + insurance + otherExpenses);
    const preTaxProfit = operatingProfit - loanInterest;
    const postTaxProfit = Math.floor(preTaxProfit * 0.8); // 仮の税率20%

    data.push({
      period,
      income: {
        rent,
        other,
      },
      expenses: {
        loan_principal: loanPrincipal,
        loan_interest: loanInterest,
        management_fee: managementFee,
        property_tax: propertyTax,
        repair_cost: repairCost,
        utility,
        insurance,
        other_expenses: otherExpenses,
      },
      operating_profit: operatingProfit,
      pre_tax_profit: preTaxProfit,
      post_tax_profit: postTaxProfit,
      cumulative_cash_flow:
        i === 0 ? postTaxProfit : data[i - 1]?.cumulative_cash_flow + postTaxProfit,
    });
  }

  return data;
}
