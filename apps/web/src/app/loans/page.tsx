'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import LoanTable from '../../components/loans/LoanTable';

type Loan = {
  id: string;
  name: string;
  property_name: string;
  lender: string;
  loanAmount: number;
  remainingBalance: number;
  interestRate: number;
  interestType: 'fixed' | 'variable';
  repaymentType: 'principal_and_interest' | 'principal_equal';
  termYears: number;
  startDate: string;
  monthlyPayment: number;
  nextDue: string;
};

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
  const [loans, setLoans] = useState<Loan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('lender');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterProperty, setFilterProperty] = useState<string>('');

  useEffect(() => {
    fetch('/api/loans')
      .then((res) => res.json())
      .then((data) => {
        setLoans(data);
      });
  }, []);

  const properties = Array.from(new Set(loans.map((loan) => loan.property_name)));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedLoans = loans
    .filter((loan) => {
      const matchesSearch =
        loan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.property_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProperty = filterProperty ? loan.property_name === filterProperty : true;
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
              loans={filteredAndSortedLoans.map((loan) => ({
                ...loan,
                property: loan.property_name, // LoanTableコンポーネントがpropertyフィールドを期待
              }))}
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
