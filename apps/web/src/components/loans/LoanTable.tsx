'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@richman/ui';

type Loan = {
  id: string;
  name: string;
  property: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  nextDue: string;
  lender?: string;
};

type SortField = 'name' | 'property' | 'balance' | 'interestRate' | 'monthlyPayment' | 'nextDue';
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
            <TableHead className={onSort ? 'cursor-pointer' : ''} onClick={() => onSort?.('name')}>
              ローン名{renderSortIndicator('name')}
            </TableHead>
            <TableHead
              className={onSort ? 'cursor-pointer' : ''}
              onClick={() => onSort?.('property')}
            >
              物件{renderSortIndicator('property')}
            </TableHead>
            <TableHead
              className={`text-right ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('balance')}
            >
              残高{renderSortIndicator('balance')}
            </TableHead>
            <TableHead
              className={`text-right ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('interestRate')}
            >
              金利{renderSortIndicator('interestRate')}
            </TableHead>
            <TableHead
              className={`text-right ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('monthlyPayment')}
            >
              月額返済{renderSortIndicator('monthlyPayment')}
            </TableHead>
            <TableHead
              className={onSort ? 'cursor-pointer' : ''}
              onClick={() => onSort?.('nextDue')}
            >
              次回支払日{renderSortIndicator('nextDue')}
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
                <TableCell className="font-medium">{loan.name}</TableCell>
                <TableCell>{loan.property}</TableCell>
                <TableCell className="text-right">{formatCurrency(loan.balance)}</TableCell>
                <TableCell className="text-right">{loan.interestRate}%</TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(loan.monthlyPayment || 0)}
                </TableCell>
                <TableCell>{formatDate(loan.nextDue)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center">
                借入データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
