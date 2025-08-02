'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ExpenseSummary = {
  id: string;
  property_id: string;
  category: string;
  amount: number;
  expense_date: Date;
  vendor: string;
  description: string;
  property_name: string;
};

type SortField = 'expense_date' | 'category' | 'amount' | 'property_name';
type SortDirection = 'asc' | 'desc';

interface ExpenseTableProps {
  expenses: ExpenseSummary[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export default function ExpenseTable({
  expenses,
  sortField,
  sortDirection,
  onSort,
}: ExpenseTableProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  };

  const handleExpenseClick = (id: string) => {
    router.push(`/expenses/${id}`);
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <>
      {/* Mobile card view */}
      <div className="block md:hidden">
        <div className="space-y-3 p-4">
          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <Card key={expense.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">{expense.category}</h3>
                    <p className="text-lg font-semibold">{formatCurrency(expense.amount)}</p>
                  </div>
                  <p className="text-sm text-text-muted">{expense.property_name}</p>
                  <p className="text-sm">{expense.description}</p>
                  <div className="flex items-center justify-between text-sm text-text-muted">
                    <span>{expense.vendor}</span>
                    <span>{formatDate(expense.expense_date)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 min-h-[36px] w-full"
                    onClick={() => handleExpenseClick(expense.id)}
                  >
                    詳細を見る
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="p-8 text-center text-text-muted">支出データがありません</div>
          )}
        </div>
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-default">
                <th
                  className="cursor-pointer p-3 text-left text-sm font-medium text-text-muted"
                  onClick={() => onSort('expense_date')}
                >
                  日付{renderSortIndicator('expense_date')}
                </th>
                <th
                  className="cursor-pointer p-3 text-left text-sm font-medium text-text-muted"
                  onClick={() => onSort('property_name')}
                >
                  物件{renderSortIndicator('property_name')}
                </th>
                <th
                  className="cursor-pointer p-3 text-left text-sm font-medium text-text-muted"
                  onClick={() => onSort('category')}
                >
                  カテゴリ{renderSortIndicator('category')}
                </th>
                <th className="p-3 text-left text-sm font-medium text-text-muted">説明</th>
                <th className="p-3 text-left text-sm font-medium text-text-muted">業者</th>
                <th
                  className="cursor-pointer p-3 text-right text-sm font-medium text-text-muted"
                  onClick={() => onSort('amount')}
                >
                  金額{renderSortIndicator('amount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="cursor-pointer border-b border-border-default hover:bg-gray-50"
                    onClick={() => handleExpenseClick(expense.id)}
                  >
                    <td className="p-3">{formatDate(expense.expense_date)}</td>
                    <td className="p-3">{expense.property_name}</td>
                    <td className="p-3">{expense.category}</td>
                    <td className="p-3">{expense.description}</td>
                    <td className="p-3">{expense.vendor}</td>
                    <td className="p-3 text-right font-semibold">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-3 py-8 text-center">
                    支出データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
