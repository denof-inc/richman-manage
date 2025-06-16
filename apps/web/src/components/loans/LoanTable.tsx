'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@richman/ui';

type Loan = {
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
  monthlyPayment: number;
};

type SortField =
  | 'lender'
  | 'loanAmount'
  | 'interestRate'
  | 'termYears'
  | 'monthlyPayment'
  | 'remainingBalance';
type SortDirection = 'asc' | 'desc';

interface LoanTableProps {
  loans: Loan[];
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}

export default function LoanTable({ loans, sortField, sortDirection, onSort }: LoanTableProps) {
  const router = useRouter();

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

  const handleLoanClick = (id: string) => {
    router.push(`/loans/${id}`);
  };

  const renderSortIndicator = (field: SortField) => {
    if (!sortField || sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className={onSort ? 'cursor-pointer' : ''}
              onClick={() => onSort?.('lender')}
            >
              金融機関{renderSortIndicator('lender')}
            </TableHead>
            <TableHead>物件</TableHead>
            <TableHead
              className={`text-right ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('loanAmount')}
            >
              借入額{renderSortIndicator('loanAmount')}
            </TableHead>
            <TableHead
              className={`text-right ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('interestRate')}
            >
              金利{renderSortIndicator('interestRate')}
            </TableHead>
            <TableHead
              className={`text-right ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('termYears')}
            >
              期間{renderSortIndicator('termYears')}
            </TableHead>
            <TableHead>開始日</TableHead>
            <TableHead
              className={`text-right ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('monthlyPayment')}
            >
              月額返済{renderSortIndicator('monthlyPayment')}
            </TableHead>
            <TableHead
              className={`text-right ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('remainingBalance')}
            >
              残債{renderSortIndicator('remainingBalance')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.length > 0 ? (
            loans.map((loan) => (
              <TableRow
                key={loan.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleLoanClick(loan.id)}
              >
                <TableCell className="font-medium">{loan.lender}</TableCell>
                <TableCell>{loan.property}</TableCell>
                <TableCell className="text-right">{formatCurrency(loan.loanAmount)}</TableCell>
                <TableCell className="text-right">
                  {loan.interestRate}%
                  <span className="ml-1 text-xs text-gray-500">
                    ({loan.interestType === 'fixed' ? '固定' : '変動'})
                  </span>
                </TableCell>
                <TableCell className="text-right">{loan.termYears}年</TableCell>
                <TableCell>{formatDate(loan.startDate)}</TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(loan.monthlyPayment)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(loan.remainingBalance)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center">
                借入データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
