'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';

interface Loan {
  id: string;
  name: string;
  property: string;
  balance: number;
  interestRate: number;
  nextDue: string;
}

export default function LoanListPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filterProperty, setFilterProperty] = useState<string>('');

  useEffect(() => {
    fetch('/api/loans')
      .then((res) => res.json())
      .then((data) => setLoans(data));
  }, []);

  const properties = Array.from(new Set(loans.map((loan) => loan.property)));

  const filteredLoans = filterProperty
    ? loans.filter((loan) => loan.property === filterProperty)
    : loans;

  const columns: Column<Loan>[] = [
    { header: 'ローン名', accessor: 'name' },
    { header: '物件', accessor: 'property' },
    {
      header: '残高',
      accessor: 'balance',
      render: (row) => `¥${row.balance.toLocaleString()}`,
    },
    {
      header: '利率',
      accessor: 'interestRate',
      render: (row) => `${row.interestRate}%`,
    },
    {
      header: '次回支払日',
      accessor: 'nextDue',
      render: (row) => new Date(row.nextDue).toLocaleDateString('ja-JP'),
    },
  ];

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="mb-6 text-2xl font-bold text-text-base">ローン一覧</h1>
          <Link href="/loans/new">
            <Button variant="accent">＋ローン追加</Button>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <label htmlFor="property" className="mr-2 text-sm font-medium text-text-base">
            物件：
          </label>
          <select
            id="property"
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="block w-1/3 rounded-md border border-border-default bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">すべての物件</option>
            {properties.map((prop) => (
              <option key={prop} value={prop}>
                {prop}
              </option>
            ))}
          </select>
        </div>
        <DataTable data={filteredLoans} columns={columns} />
      </div>
    </main>
  );
}
