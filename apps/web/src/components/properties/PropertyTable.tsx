'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@richman/ui';

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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => onSort('name')}>
              物件名{renderSortIndicator('name')}
            </TableHead>
            <TableHead
              className="cursor-pointer text-right"
              onClick={() => onSort('potential_rent')}
            >
              満室想定家賃{renderSortIndicator('potential_rent')}
            </TableHead>
            <TableHead className="cursor-pointer text-right" onClick={() => onSort('actual_rent')}>
              実際の家賃{renderSortIndicator('actual_rent')}
            </TableHead>
            <TableHead
              className="cursor-pointer text-right"
              onClick={() => onSort('monthly_repayment')}
            >
              返済額{renderSortIndicator('monthly_repayment')}
            </TableHead>
            <TableHead className="cursor-pointer text-right" onClick={() => onSort('net_cf')}>
              キャッシュフロー{renderSortIndicator('net_cf')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.length > 0 ? (
            properties.map((property) => (
              <TableRow
                key={property.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handlePropertyClick(property.id)}
              >
                <TableCell className="font-medium">{property.name}</TableCell>
                <TableCell className="text-right text-sm text-green-600">
                  {formatCurrency(property.potential_rent)}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(property.actual_rent)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(property.monthly_repayment)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(property.net_cf)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center">
                物件データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
