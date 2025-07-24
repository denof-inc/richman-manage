'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { getPropertyExpenses } from '@/data/mockData';

interface PropertyExpenseTableProps {
  propertyId: string;
}

export default function PropertyExpenseTable({ propertyId }: PropertyExpenseTableProps) {
  // Get expenses for this property
  const propertyExpenses = getPropertyExpenses(propertyId);

  if (propertyExpenses.length === 0) {
    return <div className="py-8 text-center text-gray-500">この物件の支出データはありません</div>;
  }

  return (
    <div className="overflow-x-auto p-4">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left text-sm font-medium">支出日</th>
            <th className="py-2 text-left text-sm font-medium">勘定科目</th>
            <th className="py-2 text-right text-sm font-medium">金額</th>
            <th className="py-2 text-left text-sm font-medium">内容</th>
          </tr>
        </thead>
        <tbody>
          {propertyExpenses.map((expense) => (
            <tr key={expense.id} className="border-b">
              <td className="py-2 text-left text-sm">
                {expense.expense_date.toLocaleDateString('ja-JP')}
              </td>
              <td className="py-2 text-left text-sm">{expense.category}</td>
              <td className="py-2 text-right text-sm font-medium">
                {formatCurrency(expense.amount)}
              </td>
              <td className="py-2 text-left text-sm">{expense.description || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-right text-lg font-bold">
        合計: {formatCurrency(propertyExpenses.reduce((sum, expense) => sum + expense.amount, 0))}
      </div>
    </div>
  );
}
