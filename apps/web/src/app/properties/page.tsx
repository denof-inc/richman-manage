'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Input,
} from '@richman/ui';
import { Search } from 'lucide-react';

import propertySummaryData from '../../../src/mock/propertySummary.json';

type PropertySummary = {
  id: string;
  name: string;
  address: string;
  monthly_rent: number;
  monthly_repayment: number;
  net_cf: number;
};

type SortField = 'name' | 'monthly_rent' | 'monthly_repayment' | 'net_cf';
type SortDirection = 'asc' | 'desc';

export default function PropertyListPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    setProperties(propertySummaryData);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredAndSortedProperties = properties
    .filter(
      (property) =>
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handlePropertyClick = (id: string) => {
    router.push(`/properties/${id}`);
  };

  const handleAddProperty = () => {
    router.push('/properties/new');
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col items-start justify-between md:flex-row md:items-center">
        <h1 className="mb-4 text-2xl font-bold text-primary md:mb-0">物件一覧</h1>
        <Button onClick={handleAddProperty} className="bg-primary hover:bg-primary/90">
          + 物件を追加
        </Button>
      </div>

      <div className="relative mb-6">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
          size={18}
        />
        <Input
          placeholder="物件名や住所で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-primary">物件一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                    物件名{renderSortIndicator('name')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort('monthly_rent')}
                  >
                    月間賃料{renderSortIndicator('monthly_rent')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort('monthly_repayment')}
                  >
                    月間返済{renderSortIndicator('monthly_repayment')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort('net_cf')}
                  >
                    純CF{renderSortIndicator('net_cf')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProperties.length > 0 ? (
                  filteredAndSortedProperties.map((property) => (
                    <TableRow
                      key={property.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handlePropertyClick(property.id)}
                    >
                      <TableCell className="font-medium">{property.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(property.monthly_rent)}
                      </TableCell>
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
                    <TableCell colSpan={4} className="py-8 text-center">
                      {searchTerm ? '検索結果がありません' : '物件データがありません'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
