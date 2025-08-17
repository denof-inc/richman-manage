'use client';

// ProtectedRouteを使用するページは動的レンダリングが必要
export const dynamic = 'force-dynamic';

import React, { useCallback, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

import MainLayout from '../../components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ExpenseTable from '../../components/expenses/ExpenseTable';
import { request } from '@/lib/api/client';
import { ExpenseResponseSchema } from '@/lib/api/schemas/expense';
import { PropertyResponseSchema } from '@/lib/api/schemas/property';

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

export default function ExpenseListPage() {
  const router = useRouter();
  const { showError } = useToast();
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('expense_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    const [expRes, propsRes] = await Promise.all([
      request('/api/expenses', ExpenseResponseSchema.array()),
      request('/api/properties', PropertyResponseSchema.array()),
    ]);
    const propPairs = (propsRes.data || []).map((p) => [p.id, p.name] as const);
    const propNameMap = new Map<string, string>(propPairs);
    setPropertyOptions(propPairs.map(([id, name]) => ({ id, name })));
    const expenseSummaries: ExpenseSummary[] = (expRes.data || []).map((e) => ({
      id: e.id,
      property_id: e.property_id,
      category: e.category,
      amount: e.amount,
      expense_date: new Date(e.expense_date),
      vendor: e.vendor || '',
      description: e.description || '',
      property_name: propNameMap.get(e.property_id) || '不明な物件',
    }));
    setExpenses(expenseSummaries);
  }, []);

  useEffect(() => {
    load().catch(() =>
      showError('支出データの取得に失敗しました', { label: '再試行', onAction: () => load() })
    );
  }, [load, showError]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedExpenses = expenses
    .filter(
      (expense) =>
        (expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.vendor.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedPropertyId ? expense.property_id === selectedPropertyId : true)
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortField === 'expense_date') {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

  const handleAddExpense = () => {
    router.push('/expenses/new');
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex flex-col items-start justify-between md:flex-row md:items-center">
            <h1 className="mb-4 text-2xl font-bold text-primary md:mb-0">支出一覧</h1>
            <div className="flex items-center space-x-4">
              <select
                value={selectedPropertyId || ''}
                onChange={(e) => setSelectedPropertyId(e.target.value || null)}
                className="rounded border px-3 py-1 text-sm"
              >
                <option value="">すべての物件</option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <Button onClick={handleAddExpense} className="bg-primary hover:bg-primary/90">
                + 支出を追加
              </Button>
            </div>
          </div>

          <div className="relative mb-6">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="カテゴリや説明で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-border-default px-3 py-2 pl-10 text-sm"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <ExpenseTable
                expenses={filteredAndSortedExpenses}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
