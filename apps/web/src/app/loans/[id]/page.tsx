'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@richman/ui';
import { ArrowLeft, Edit, TrendingUp } from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout';

interface LoanDetail {
  id: string;
  name: string;
  property: string;
  balance: number;
  interestRate: number;
  monthlyPayment?: number;
  lender?: string;
  startDate?: string;
  endDate?: string;
}

interface Repayment {
  date: string;
  amount: number;
  principal?: number;
  interest?: number;
}

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [interestHistory, setInterestHistory] = useState<{ date: string; rate: number }[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/loans/${id}`)
      .then((res) => res.json())
      .then((data) => {
        // 追加情報を補充（APIで提供されていない場合の暫定対応）
        setLoan({
          ...data,
          monthlyPayment: data.monthlyPayment || Math.round(data.balance * 0.003),
          lender: data.lender || '三菱UFJ銀行',
          startDate: data.startDate || '2020-04-01',
          endDate: data.endDate || '2055-03-31',
        });
      });

    fetch(`/api/loans/${id}/repayments`)
      .then((res) => res.json())
      .then((data) => setRepayments(data))
      .catch(() => {
        // モックデータ
        setRepayments([
          { date: '2024-12-01', amount: 150000, principal: 100000, interest: 50000 },
          { date: '2024-11-01', amount: 150000, principal: 99000, interest: 51000 },
          { date: '2024-10-01', amount: 150000, principal: 98000, interest: 52000 },
        ]);
      });

    // 金利履歴
    setInterestHistory([
      { date: '2024-01', rate: 2.5 },
      { date: '2024-04', rate: 2.7 },
      { date: '2024-07', rate: 2.9 },
    ]);
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
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="p-2">
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
                  <span className="text-text-muted">残高</span>
                  <span className="text-xl font-bold">{formatCurrency(loan.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">現在金利</span>
                  <span className="font-medium">{loan.interestRate}%</span>
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

        {/* 金利履歴チャート */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                金利推移
              </CardTitle>
              <Button variant="outline" size="sm">
                金利変更を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={interestHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>返済日</TableHead>
                  <TableHead className="text-right">元金</TableHead>
                  <TableHead className="text-right">利息</TableHead>
                  <TableHead className="text-right">返済額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repayments.map((repayment, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(repayment.date)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(repayment.principal || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(repayment.interest || 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(repayment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
