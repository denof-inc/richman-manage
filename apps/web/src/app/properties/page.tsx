'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

import MainLayout from '../../components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PropertyTable from '../../components/properties/PropertyTable';
import { request } from '@/lib/api/client';
import { PropertyResponseSchema } from '@/lib/api/schemas/property';
import { RentRollResponseSchema } from '@/lib/api/schemas/rent-roll';
import { ExpenseResponseSchema } from '@/lib/api/schemas/expense';
import { LoanResponseSchema } from '@/lib/api/schemas/loan';

type PropertySummary = {
  id: string;
  name: string;
  address: string;
  potential_rent: number;
  actual_rent: number;
  monthly_repayment: number;
  net_cf: number;
  owner_id: string;
};

type SortField = 'name' | 'potential_rent' | 'actual_rent' | 'monthly_repayment' | 'net_cf';
type SortDirection = 'asc' | 'desc';

export default function PropertyListPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [propsRes, rentRes, expRes, loanRes] = await Promise.all([
          request('/api/properties', PropertyResponseSchema.array()),
          request('/api/rent-rolls', RentRollResponseSchema.array()),
          request('/api/expenses', ExpenseResponseSchema.array()),
          request('/api/loans', LoanResponseSchema.array()),
        ]);

        const rentByProperty = new Map<string, { potential: number; actual: number }>();
        (rentRes.data || []).forEach((r) => {
          const key = r.property_id;
          const current = rentByProperty.get(key) || { potential: 0, actual: 0 };
          current.potential += r.monthly_rent || 0;
          if (r.occupancy_status === 'occupied') current.actual += r.monthly_rent || 0;
          rentByProperty.set(key, current);
        });

        const monthlyRepaymentByProperty = new Map<string, number>();
        (loanRes.data || []).forEach((l) => {
          const key = l.property_id;
          monthlyRepaymentByProperty.set(
            key,
            (monthlyRepaymentByProperty.get(key) || 0) + (l.monthly_payment || 0)
          );
        });

        const monthlyExpenseByProperty = new Map<string, number>();
        (expRes.data || []).forEach((e) => {
          if (e.is_recurring && e.recurring_frequency === 'monthly') {
            const key = e.property_id;
            monthlyExpenseByProperty.set(
              key,
              (monthlyExpenseByProperty.get(key) || 0) + (e.amount || 0)
            );
          }
        });

        const summaries: PropertySummary[] = (propsRes.data || []).map((p) => {
          const rent = rentByProperty.get(p.id) || { potential: 0, actual: 0 };
          const monthly_repayment = monthlyRepaymentByProperty.get(p.id) || 0;
          const monthly_expenses = monthlyExpenseByProperty.get(p.id) || 0;
          const net_cf = rent.actual - monthly_repayment - monthly_expenses;
          return {
            id: p.id,
            name: p.name,
            address: p.address,
            potential_rent: rent.potential,
            actual_rent: rent.actual,
            monthly_repayment,
            net_cf,
            owner_id: p.user_id,
          };
        });

        if (mounted) setProperties(summaries);
      } catch (e) {
        console.warn('Failed to load property summaries', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedProperties = properties
    .filter(
      (property) =>
        (property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.address.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedOwnerId ? property.owner_id === selectedOwnerId : true)
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

  const handleAddProperty = () => {
    router.push('/properties/new');
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex flex-col items-start justify-between md:flex-row md:items-center">
            <h1 className="mb-4 text-2xl font-bold text-primary md:mb-0">物件一覧</h1>
            <div className="flex items-center space-x-4">
              <select
                value={selectedOwnerId || ''}
                onChange={(e) => setSelectedOwnerId(e.target.value || null)}
                className="rounded border px-3 py-1 text-sm"
              >
                <option value="">すべての所有者</option>
                {/* 所有者選択は現APIに未実装のため、一旦全件のみ */}
              </select>
              <Button onClick={handleAddProperty} className="bg-primary hover:bg-primary/90">
                + 物件を追加
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
              placeholder="物件名や住所で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-border-default px-3 py-2 pl-10 text-sm"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <PropertyTable
                properties={filteredAndSortedProperties}
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
