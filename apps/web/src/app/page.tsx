'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpIcon, ArrowDownIcon, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

import MainLayout from '../components/layout/MainLayout';
import {
  mockProperties,
  getPropertyUnits,
  getPropertyLoans,
  getPropertyExpenses,
} from '../data/mockData';

type PropertySummary = {
  id: string;
  name: string;
  address: string;
  potential_rent: number;
  actual_rent: number;
  monthly_repayment: number;
  net_cf: number;
  owner_id: string;
};

type RecentTransaction = {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  property?: string;
};

export default function HomePage() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  useEffect(() => {
    // 統一データから物件サマリーを生成
    const propertySummaries: PropertySummary[] = mockProperties.map((property) => {
      const units = getPropertyUnits(property.id);
      const loans = getPropertyLoans(property.id);
      const expenses = getPropertyExpenses(property.id);

      // 潜在家賃と実際の家賃を計算
      const potential_rent = units.reduce((sum, unit) => sum + (unit.rent_amount || 0), 0);
      const actual_rent = units
        .filter((unit) => unit.status === 'occupied')
        .reduce((sum, unit) => sum + (unit.rent_amount || 0), 0);

      // 月次ローン返済額を計算
      const monthly_repayment = loans.reduce((sum, loan) => sum + loan.payment_amount, 0);

      // 月次経費を計算
      const monthly_expenses = expenses
        .filter((expense) => expense.is_recurring && expense.recurring_frequency === 'monthly')
        .reduce((sum, expense) => sum + expense.amount, 0);

      // ネットキャッシュフロー = 実際の家賃 - ローン返済 - 経費
      const net_cf = actual_rent - monthly_repayment - monthly_expenses;

      return {
        id: property.id,
        name: property.name,
        address: property.address,
        potential_rent,
        actual_rent,
        monthly_repayment,
        net_cf,
        owner_id: property.owner_id,
      };
    });

    setProperties(propertySummaries);

    // モック取引データを生成
    const mockTransactions: RecentTransaction[] = [
      {
        id: '1',
        type: 'income',
        description: '家賃収入',
        amount: 320000,
        date: '2024-12-01',
        property: '青山マンション',
      },
      {
        id: '2',
        type: 'expense',
        description: 'ローン返済',
        amount: 210000,
        date: '2024-12-01',
        property: '青山マンション',
      },
      {
        id: '3',
        type: 'income',
        description: '家賃収入',
        amount: 800000,
        date: '2024-12-01',
        property: '渋谷アパート',
      },
      {
        id: '4',
        type: 'expense',
        description: '管理費',
        amount: 25000,
        date: '2024-11-30',
        property: '青山マンション',
      },
      {
        id: '5',
        type: 'expense',
        description: 'ローン返済',
        amount: 200000,
        date: '2024-11-30',
        property: '渋谷アパート',
      },
    ];
    setRecentTransactions(mockTransactions);
  }, []);

  // KPI計算
  const totalIncome = properties.reduce((sum, property) => sum + property.actual_rent, 0);
  const totalExpenses = properties.reduce((sum, property) => sum + property.monthly_repayment, 0);
  const netCashFlow = properties.reduce((sum, property) => sum + property.net_cf, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">ダッシュボード</h1>
          <p className="mt-2 text-text-muted">月次収支の概要と最近の取引履歴</p>
        </div>

        {/* KPIサマリーカード */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">月次総収入</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalIncome)}</div>
              <p className="text-xs text-text-muted">
                <span className="font-medium text-accent">+2.5%</span> 前月比
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">月次総支出</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-text-muted">
                <span className="font-medium text-red-500">+1.2%</span> 前月比
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">
                月次キャッシュフロー
              </CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(netCashFlow)}</div>
              <p className="text-xs text-text-muted">
                <span className="font-medium text-accent">+4.1%</span> 前月比
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* 最近の取引履歴 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-primary">最近の取引履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`rounded-full p-2 ${
                          transaction.type === 'income'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {transaction.type === 'income' ? (
                          <ArrowUpIcon className="h-4 w-4" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-primary">{transaction.description}</p>
                        <p className="text-sm text-text-muted">
                          {transaction.property} • {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`font-semibold ${
                        transaction.type === 'income' ? 'text-accent' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-primary">
                クイックアクション
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/properties">
                  <Button variant="outline" className="h-14 w-full justify-start">
                    <div className="text-left">
                      <div className="font-medium">物件一覧</div>
                      <div className="text-sm text-text-muted">所有物件を確認・管理</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/loans">
                  <Button variant="outline" className="h-14 w-full justify-start">
                    <div className="text-left">
                      <div className="font-medium">借入一覧</div>
                      <div className="text-sm text-text-muted">ローン情報を確認・管理</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/rent-roll">
                  <Button variant="outline" className="h-14 w-full justify-start">
                    <div className="text-left">
                      <div className="font-medium">レントロール</div>
                      <div className="text-sm text-text-muted">入居状況を確認・管理</div>
                    </div>
                  </Button>
                </Link>

                <Button variant="outline" className="h-14 w-full justify-start" disabled>
                  <div className="text-left">
                    <div className="font-medium">キャッシュフロー表</div>
                    <div className="text-sm text-text-muted">月次・年次の収支分析（準備中）</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 物件概要 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">物件概要</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {properties.slice(0, 6).map((property) => (
                <Link key={property.id} href={`/properties/${property.id}`}>
                  <div className="cursor-pointer rounded-lg border border-border-default p-4 transition-colors hover:border-primary">
                    <h3 className="mb-2 font-medium text-primary">{property.name}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">月収:</span>
                        <span className="font-medium">{formatCurrency(property.actual_rent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">返済:</span>
                        <span className="font-medium">
                          {formatCurrency(property.monthly_repayment)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-text-muted">CF:</span>
                        <span className="font-semibold text-accent">
                          {formatCurrency(property.net_cf)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {properties.length > 6 && (
              <div className="mt-4 text-center">
                <Link href="/properties">
                  <Button variant="outline">すべての物件を表示</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
