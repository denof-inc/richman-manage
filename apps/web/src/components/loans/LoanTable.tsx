'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
// Table components removed - using HTML table elements

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
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-default">
            <th
              className={`p-3 text-left text-sm font-medium text-text-muted ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('lender')}
            >
              金融機関{renderSortIndicator('lender')}
            </th>
            <th className="p-3 text-left text-sm font-medium text-text-muted">物件</th>
            <th
              className={`p-3 text-right text-sm font-medium text-text-muted ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('loanAmount')}
            >
              借入額{renderSortIndicator('loanAmount')}
            </th>
            <th
              className={`p-3 text-right text-sm font-medium text-text-muted ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('interestRate')}
            >
              金利{renderSortIndicator('interestRate')}
            </th>
            <th
              className={`p-3 text-right text-sm font-medium text-text-muted ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('termYears')}
            >
              期間{renderSortIndicator('termYears')}
            </th>
            <th className="p-3 text-left text-sm font-medium text-text-muted">開始日</th>
            <th
              className={`p-3 text-right text-sm font-medium text-text-muted ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('monthlyPayment')}
            >
              月額返済{renderSortIndicator('monthlyPayment')}
            </th>
            <th
              className={`p-3 text-right text-sm font-medium text-text-muted ${onSort ? 'cursor-pointer' : ''}`}
              onClick={() => onSort?.('remainingBalance')}
            >
              残債{renderSortIndicator('remainingBalance')}
            </th>
          </tr>
        </thead>
        <tbody>
          {loans.length > 0 ? (
            loans.map((loan) => (
              <tr
                key={loan.id}
                className="cursor-pointer border-b border-border-default hover:bg-gray-50"
                onClick={() => handleLoanClick(loan.id)}
              >
                <td className="p-3 font-medium">{loan.lender}</td>
                <td className="p-3">{loan.property}</td>
                <td className="p-3 text-right">{formatCurrency(loan.loanAmount)}</td>
                <td className="p-3 text-right">
                  {loan.interestRate}%
                  <span className="ml-1 text-xs text-gray-500">
                    ({loan.interestType === 'fixed' ? '固定' : '変動'})
                  </span>
                </td>
                <td className="p-3 text-right">{loan.termYears}年</td>
                <td className="p-3">{formatDate(loan.startDate)}</td>
                <td className="p-3 text-right text-red-600">
                  {formatCurrency(loan.monthlyPayment)}
                </td>
                <td className="p-3 text-right">{formatCurrency(loan.remainingBalance)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="p-3 py-8 text-center">
                借入データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
