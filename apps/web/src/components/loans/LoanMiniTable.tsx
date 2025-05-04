'use client';

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@richman/ui';

type Loan = {
  id: string;
  lender_name: string;
  loan_amount: number;
  interest_rate: number;
  term_years: number;
  start_date: string;
  payment_amount: number;
  remaining_balance: number;
};

export default function LoanMiniTable(): React.ReactElement {
  const loansData: Loan[] = [
    {
      id: '1',
      lender_name: '三菱UFJ銀行',
      loan_amount: 50000000,
      interest_rate: 1.2,
      term_years: 35,
      start_date: '2020-04-01',
      payment_amount: 150000,
      remaining_balance: 48500000,
    },
    {
      id: '2',
      lender_name: 'みずほ銀行',
      loan_amount: 20000000,
      interest_rate: 1.5,
      term_years: 20,
      start_date: '2021-07-15',
      payment_amount: 100000,
      remaining_balance: 19200000,
    },
  ];

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

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>金融機関</TableHead>
            <TableHead className="text-right">借入額</TableHead>
            <TableHead className="text-right">金利</TableHead>
            <TableHead className="text-right">期間</TableHead>
            <TableHead>開始日</TableHead>
            <TableHead className="text-right">月額返済</TableHead>
            <TableHead className="text-right">残高</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loansData.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell className="font-medium">{loan.lender_name}</TableCell>
              <TableCell className="text-right">{formatCurrency(loan.loan_amount)}</TableCell>
              <TableCell className="text-right">{loan.interest_rate}%</TableCell>
              <TableCell className="text-right">{loan.term_years}年</TableCell>
              <TableCell>{formatDate(loan.start_date)}</TableCell>
              <TableCell className="text-right">{formatCurrency(loan.payment_amount)}</TableCell>
              <TableCell className="text-right">{formatCurrency(loan.remaining_balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
