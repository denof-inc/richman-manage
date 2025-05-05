'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import MainLayout from '../../../components/layout/MainLayout';

interface LoanDetail {
  id: string;
  name: string;
  property: string;
  balance: number;
  interestRate: number;
}
interface Repayment {
  date: string;
  amount: number;
}

export default function LoanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [interestHistory, setInterestHistory] = useState<{ date: string; rate: number }[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/loans/${id}`)
      .then((res) => res.json())
      .then((data) => setLoan(data));

    fetch(`/api/loans/${id}/repayments`)
      .then((res) => res.json())
      .then((data) => setRepayments(data));

    // mock interest history
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

  const repaymentColumns: Column<Repayment>[] = [
    { header: '返済日', accessor: 'date' },
    { header: '返済額', accessor: 'amount', render: (row) => `¥${row.amount.toLocaleString()}` },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen space-y-8 bg-background p-8">
        {/* ローン詳細カード */}
        <div className="rounded-md bg-white p-6 shadow">
          <h1 className="mb-4 text-2xl font-bold text-text-base">{loan.name}</h1>
          <p className="text-text-muted">{loan.property}</p>
          <div className="mt-4 space-y-2 text-text-base">
            <p>残高: ¥{loan.balance.toLocaleString()}</p>
            <p>利率: {loan.interestRate}%</p>
          </div>
        </div>

        {/* 利率履歴チャート */}
        <div className="rounded-md bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-semibold text-text-base">利率履歴</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={interestHistory}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#295E4F" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 返済履歴テーブル */}
        <div className="rounded-md bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-text-base">返済履歴</h3>
            <select className="rounded-md border border-border-default px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary">
              <option>すべての年</option>
            </select>
          </div>
          <DataTable data={repayments} columns={repaymentColumns} />
        </div>

        {/* 利率変更追加モーダル (ダミー) */}
        <Button variant="outline">利率変更を追加</Button>
      </div>
    </MainLayout>
  );
}
