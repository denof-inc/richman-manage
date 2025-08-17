'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// グラフコンポーネントを削除
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, History } from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { request } from '@/lib/api/client';
import { LoanResponseSchema } from '@/lib/api/schemas/loan';
import { LoanRepaymentResponseSchema } from '@/lib/api/schemas/loan-repayment';

interface LoanDetail {
  id: string;
  name: string;
  property: string;
  lender: string;
  loanAmount: number;
  remainingBalance: number;
  interestRate: number;
  interestType: 'fixed' | 'variable';
  repaymentType: 'principal_and_interest' | 'principal_equal';
  termYears: number;
  startDate: string;
  endDate: string;
  monthlyPayment: number;
}

interface Repayment {
  date: string;
  amount: number;
  principal?: number;
  interest?: number;
}

interface InterestChange {
  date: string;
  oldRate: number;
  newRate: number;
  reason: string;
}

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [interestChanges, setInterestChanges] = useState<InterestChange[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [{ data: loanData }, { data: repaymentsData }] = await Promise.all([
          request(`/api/loans/${id}`, LoanResponseSchema),
          request(`/api/loans/${id}/repayments`, LoanRepaymentResponseSchema.array()),
        ]);
        // Map API loan to UI LoanDetail
        setLoan({
          id: loanData.id,
          name: loanData.lender_name,
          property: '',
          lender: loanData.lender_name,
          loanAmount: loanData.principal_amount,
          remainingBalance: loanData.current_balance,
          interestRate: loanData.interest_rate,
          interestType: 'fixed',
          repaymentType: 'principal_and_interest',
          termYears: Math.floor((loanData.loan_term_months ?? 0) / 12),
          startDate: loanData.created_at,
          endDate: loanData.updated_at,
          monthlyPayment: loanData.monthly_payment,
        });

        setRepayments(
          (repaymentsData || []).map((r) => ({
            date: r.payment_date,
            amount: r.amount,
            principal: r.principal_amount,
            interest: r.interest_amount,
          }))
        );
      } catch (e) {
        console.warn('Failed to load loan detail/repayments', e);
      }

      // 金利変動履歴（TODO: API化）
      setInterestChanges([
        { date: '2024-07-01', oldRate: 2.7, newRate: 2.9, reason: '市場金利上昇に伴う変動' },
        { date: '2024-04-01', oldRate: 2.5, newRate: 2.7, reason: '定期見直し' },
        { date: '2024-01-01', oldRate: 2.3, newRate: 2.5, reason: '日銀政策変更に伴う調整' },
      ]);
    })();
  }, [id]);

  if (!loan) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          <p>データを読み込み中...</p>
        </div>
      </MainLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const handleBack = () => {
    router.push('/loans');
  };

  const handleEdit = () => {
    router.push(`/loans/${id}/edit`);
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          {/* ヘッダー */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={handleBack} className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold text-primary">{loan.name}</h1>
            </div>
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              編集
            </Button>
          </div>

          {/* ローン概要 */}
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ローン情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">物件</span>
                    <span className="font-medium">{loan.property}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">金融機関</span>
                    <span className="font-medium">{loan.lender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">借入期間</span>
                    <span className="font-medium">
                      {loan.startDate && formatDate(loan.startDate)} 〜{' '}
                      {loan.endDate && formatDate(loan.endDate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>返済状況</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">借入額</span>
                    <span className="font-medium">{formatCurrency(loan.loanAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">残債</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(loan.remainingBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">現在金利</span>
                    <span className="font-medium">
                      {loan.interestRate}% ({loan.interestType === 'fixed' ? '固定' : '変動'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">返済方式</span>
                    <span className="font-medium">
                      {loan.repaymentType === 'principal_and_interest' ? '元利均等' : '元金均等'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">月額返済</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(loan.monthlyPayment || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 金利変動履歴 */}
          {loan.interestType === 'variable' && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <History className="mr-2 h-5 w-5" />
                    金利変動履歴
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    金利変更を追加
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border-default">
                        <th className="p-3 text-left text-sm font-medium text-text-muted">
                          変更日
                        </th>
                        <th className="p-3 text-right text-sm font-medium text-text-muted">
                          変更前
                        </th>
                        <th className="p-3 text-right text-sm font-medium text-text-muted">
                          変更後
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-text-muted">
                          変更理由
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {interestChanges.map((change, index) => (
                        <tr key={index} className="border-b border-border-default">
                          <td className="p-3">{formatDate(change.date)}</td>
                          <td className="p-3 text-right">{change.oldRate}%</td>
                          <td className="p-3 text-right font-medium">{change.newRate}%</td>
                          <td className="p-3 text-sm text-gray-600">{change.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 返済履歴 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>返済履歴</CardTitle>
                <select className="rounded border px-3 py-1 text-sm">
                  <option>すべての年</option>
                  <option>2024年</option>
                  <option>2023年</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="p-3 text-left text-sm font-medium text-text-muted">返済日</th>
                      <th className="p-3 text-right text-sm font-medium text-text-muted">元金</th>
                      <th className="p-3 text-right text-sm font-medium text-text-muted">利息</th>
                      <th className="p-3 text-right text-sm font-medium text-text-muted">返済額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repayments.map((repayment, index) => (
                      <tr key={index} className="border-b border-border-default">
                        <td className="p-3">{formatDate(repayment.date)}</td>
                        <td className="p-3 text-right">
                          {formatCurrency(repayment.principal || 0)}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(repayment.interest || 0)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(repayment.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
