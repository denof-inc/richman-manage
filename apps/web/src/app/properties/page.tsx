'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

import MainLayout from '../../components/layout/MainLayout';
import PropertyTable from '../../components/properties/PropertyTable';
import {
  mockProperties,
  mockOwners,
  getPropertyUnits,
  getPropertyLoans,
  getPropertyExpenses,
} from '../../data/mockData';

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
    // 統一データから物件サマリーを生成
    const propertySummaries: PropertySummary[] = mockProperties.map((property) => {
      const units = getPropertyUnits(property.id);
      const loans = getPropertyLoans(property.id);
      const expenses = getPropertyExpenses(property.id);

      // 潜在家賃と実際の家賃を計算
      const potential_rent = units.reduce((sum, unit) => sum + (unit.rent_amount || 0), 0);
      const actual_rent = units
        .filter((unit) => unit.status === 'occupied')
        .reduce((sum, unit) => sum + (unit.rent_amount || 0), 0);

      // 月次ローン返済額を計算
      const monthly_repayment = loans.reduce((sum, loan) => sum + loan.payment_amount, 0);

      // 月次経費を計算（年次経費を12で割る）
      const monthly_expenses = expenses
        .filter((expense) => expense.is_recurring && expense.recurring_frequency === 'monthly')
        .reduce((sum, expense) => sum + expense.amount, 0);

      // ネットキャッシュフロー = 実際の家賃 - ローン返済 - 経費
      const net_cf = actual_rent - monthly_repayment - monthly_expenses;

      return {
        id: property.id,
        name: property.name,
        address: property.address,
        potential_rent,
        actual_rent,
        monthly_repayment,
        net_cf,
        owner_id: property.owner_id,
      };
    });

    setProperties(propertySummaries);
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
              {mockOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
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
  );
}
