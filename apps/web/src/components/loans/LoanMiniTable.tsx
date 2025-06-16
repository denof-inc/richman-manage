'use client';

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@richman/ui';
import {
  getPropertyLoans,
  mockLoanRepayments,
  calculateRemainingBalance,
} from '../../data/mockData';

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

interface LoanMiniTableProps {
  propertyId?: string;
}

export default function LoanMiniTable({ propertyId }: LoanMiniTableProps): React.ReactElement {
  // 統一データから物件のローン情報を取得
  const rawLoans = propertyId ? getPropertyLoans(propertyId) : [];

  const loansData: Loan[] = rawLoans.map((loan) => ({
    id: loan.id,
    lender_name: loan.lender_name,
    loan_amount: loan.loan_amount,
    interest_rate: loan.interest_rate,
    term_years: loan.term_years,
    start_date: loan.start_date,
    payment_amount: loan.payment_amount,
    remaining_balance: calculateRemainingBalance(loan, mockLoanRepayments),
  }));

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
            <TableHead className="text-right">残債</TableHead>
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
