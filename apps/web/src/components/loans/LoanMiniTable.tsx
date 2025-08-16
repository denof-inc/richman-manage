'use client';

import React, { useEffect, useState } from 'react';
// Table components removed - using HTML table elements
import { request } from '@/lib/api/client';
import { LoanResponseSchema } from '@/lib/api/schemas/loan';

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
  const [loansData, setLoansData] = useState<Loan[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!propertyId) return;
        const { data } = await request(
          `/api/loans${propertyId ? `?property_id=${propertyId}` : ''}`,
          LoanResponseSchema.array()
        );
        const mapped: Loan[] = (data || []).map((loan) => ({
          id: loan.id,
          lender_name: loan.lender_name,
          loan_amount: loan.principal_amount,
          interest_rate: loan.interest_rate,
          term_years: Math.floor((loan.loan_term_months ?? 0) / 12),
          start_date: loan.created_at,
          payment_amount: loan.monthly_payment,
          // APIのcurrent_balanceを残債として使用
          remaining_balance: loan.current_balance,
        }));
        if (mounted) setLoansData(mapped);
      } catch (e) {
        console.warn('Failed to load property loans', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [propertyId]);

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
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-default">
            <th className="p-3 text-left text-sm font-medium text-text-muted">金融機関</th>
            <th className="p-3 text-right text-sm font-medium text-text-muted">借入額</th>
            <th className="p-3 text-right text-sm font-medium text-text-muted">金利</th>
            <th className="p-3 text-right text-sm font-medium text-text-muted">期間</th>
            <th className="p-3 text-left text-sm font-medium text-text-muted">開始日</th>
            <th className="p-3 text-right text-sm font-medium text-text-muted">月額返済</th>
            <th className="p-3 text-right text-sm font-medium text-text-muted">残債</th>
          </tr>
        </thead>
        <tbody>
          {loansData.map((loan) => (
            <tr key={loan.id} className="border-b border-border-default">
              <td className="p-3 font-medium">{loan.lender_name}</td>
              <td className="p-3 text-right">{formatCurrency(loan.loan_amount)}</td>
              <td className="p-3 text-right">{loan.interest_rate}%</td>
              <td className="p-3 text-right">{loan.term_years}年</td>
              <td className="p-3">{formatDate(loan.start_date)}</td>
              <td className="p-3 text-right">{formatCurrency(loan.payment_amount)}</td>
              <td className="p-3 text-right">{formatCurrency(loan.remaining_balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
