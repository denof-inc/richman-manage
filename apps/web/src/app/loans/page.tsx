'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import LoanTable from '../../components/loans/LoanTable';
import { request } from '@/lib/api/client';
import { LoanResponseSchema } from '@/lib/api/schemas/loan';
import { PropertyResponseSchema } from '@/lib/api/schemas/property';
import { toLoanListViewModel, type LoanListViewModel } from '@/lib/mappers/loan';

type SortField =
  | 'lender'
  | 'loanAmount'
  | 'interestRate'
  | 'termYears'
  | 'monthlyPayment'
  | 'remainingBalance';
type SortDirection = 'asc' | 'desc';

export default function LoanListPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<LoanListViewModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('lender');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterProperty, setFilterProperty] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [loansRes, propsRes] = await Promise.all([
          request('/api/loans', LoanResponseSchema.array()),
          request('/api/properties', PropertyResponseSchema.array()),
        ]);
        const propNameMap = new Map<string, string>(
          (propsRes.data || []).map((p) => [p.id as string, p.name as string])
        );
        const view = (loansRes.data || []).map((l) =>
          toLoanListViewModel(l, propNameMap.get(l.property_id))
        );
        if (mounted) setLoans(view);
      } catch (e) {
        console.warn('Failed to load loans/properties', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const properties = useMemo(
    () => Array.from(new Set(loans.map((loan) => loan.property))).filter(Boolean),
    [loans]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedLoans = useMemo(() => {
    return loans
      .filter((loan) => {
        const matchesSearch =
          loan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.property.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProperty = filterProperty ? loan.property === filterProperty : true;
        return matchesSearch && matchesProperty;
      })
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
  }, [loans, searchTerm, filterProperty, sortField, sortDirection]);

  const handleAddLoan = () => {
    router.push('/loans/new');
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col items-start justify-between md:flex-row md:items-center">
          <h1 className="mb-4 text-2xl font-bold text-primary md:mb-0">借入一覧</h1>
          <div className="flex items-center space-x-4">
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="rounded border px-3 py-1 text-sm"
            >
              <option value="">すべての物件</option>
              {properties.map((prop) => (
                <option key={prop} value={prop}>
                  {prop}
                </option>
              ))}
            </select>
            <Button onClick={handleAddLoan} className="bg-primary hover:bg-primary/90">
              + 借入を追加
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
            placeholder="ローン名や物件名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded border border-border-default px-3 py-2 pl-10 text-sm"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <LoanTable
              loans={filteredAndSortedLoans}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
