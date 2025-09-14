'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Table components removed - using HTML table elements

type PropertySummary = {
  id: string;
  name: string;
  address: string;
  potential_rent: number;
  actual_rent: number;
  monthly_repayment: number;
  net_cf: number;
};

type SortField = 'name' | 'potential_rent' | 'actual_rent' | 'monthly_repayment' | 'net_cf';
type SortDirection = 'asc' | 'desc';

interface PropertyTableProps {
  properties: PropertySummary[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export default function PropertyTable({
  properties,
  sortField,
  sortDirection,
  onSort,
}: PropertyTableProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePropertyClick = (id: string) => {
    router.push(`/properties/${id}`);
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
          {properties.length > 0 ? (
            properties.map((property) => (
              <Card key={property.id} className="p-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{property.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-text-muted">満室想定家賃</span>
                      <p className="font-medium">{formatCurrency(property.potential_rent)}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">実際の家賃</span>
                      <p className="font-medium">{formatCurrency(property.actual_rent)}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">月次返済</span>
                      <p className="font-medium">{formatCurrency(property.monthly_repayment)}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">ネットCF</span>
                      <p
                        className={`font-medium ${property.net_cf >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCurrency(property.net_cf)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 min-h-[36px] w-full"
                    onClick={() => handlePropertyClick(property.id)}
                  >
                    詳細を見る
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="p-8 text-center text-text-muted">物件データがありません</div>
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
                  onClick={() => onSort('name')}
                >
                  物件名{renderSortIndicator('name')}
                </th>
                <th
                  className="cursor-pointer p-3 text-right text-sm font-medium text-text-muted"
                  onClick={() => onSort('potential_rent')}
                >
                  満室想定家賃{renderSortIndicator('potential_rent')}
                </th>
                <th
                  className="cursor-pointer p-3 text-right text-sm font-medium text-text-muted"
                  onClick={() => onSort('actual_rent')}
                >
                  実際の家賃{renderSortIndicator('actual_rent')}
                </th>
                <th
                  className="cursor-pointer p-3 text-right text-sm font-medium text-text-muted"
                  onClick={() => onSort('monthly_repayment')}
                >
                  返済額{renderSortIndicator('monthly_repayment')}
                </th>
                <th
                  className="cursor-pointer p-3 text-right text-sm font-medium text-text-muted"
                  onClick={() => onSort('net_cf')}
                >
                  キャッシュフロー{renderSortIndicator('net_cf')}
                </th>
              </tr>
            </thead>
            <tbody>
              {properties.length > 0 ? (
                properties.map((property) => (
                  <tr
                    key={property.id}
                    className="cursor-pointer border-b border-border-default hover:bg-gray-50"
                    onClick={() => handlePropertyClick(property.id)}
                  >
                    <td className="p-3 font-medium">{property.name}</td>
                    <td className="p-3 text-right text-sm text-green-600">
                      {formatCurrency(property.potential_rent)}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(property.actual_rent)}</td>
                    <td className="p-3 text-right">{formatCurrency(property.monthly_repayment)}</td>
                    <td className="p-3 text-right font-semibold">
                      {formatCurrency(property.net_cf)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 py-8 text-center">
                    物件データがありません
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
