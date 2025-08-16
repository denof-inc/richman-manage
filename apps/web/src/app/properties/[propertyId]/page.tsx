'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Home, CreditCard, Receipt, MoreHorizontal } from 'lucide-react';

import MainLayout from '../../../components/layout/MainLayout';
import RentRollTable from '../../../components/rentroll/RentRollTable';
import LoanMiniTable from '../../../components/loans/LoanMiniTable';
import PropertyExpenseTable from '../../../components/expenses/PropertyExpenseTable';

import { request } from '@/lib/api/client';
import { PropertyResponseSchema } from '@/lib/api/schemas/property';
import { RentRollResponseSchema } from '@/lib/api/schemas/rent-roll';
import { ExpenseResponseSchema } from '@/lib/api/schemas/expense';
import { LoanResponseSchema } from '@/lib/api/schemas/loan';

type UnitType = 'residence' | 'tenant' | 'parking' | 'vending' | 'solar';
type UnitStatus = 'occupied' | 'vacant';

type RentRollUnit = {
  id: string;
  property_id: string;
  property_name: string;
  unit_number: string;
  unit_type: UnitType;
  status: UnitStatus;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  rent_amount: number;
  deposit_amount: number;
  current_tenant_name: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
};

type PropertyDetail = {
  id: string;
  name: string;
  address: string;
  owner_id: string;
  property_type: string;
  year_built: number;
  total_area: number;
  purchase_date: string;
  purchase_price: number;
  current_value: number;
  potential_rent?: number;
  actual_rent?: number;
  monthly_repayment?: number;
  monthly_expenses?: number;
  net_cf?: number;
};

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [activeTab, setActiveTab] = useState('rentroll');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [propRes, rentRes, expRes, loanRes] = await Promise.all([
          request(`/api/properties/${propertyId}`, PropertyResponseSchema),
          request(`/api/rent-rolls?property_id=${propertyId}`, RentRollResponseSchema.array()),
          request(`/api/expenses?property_id=${propertyId}`, ExpenseResponseSchema.array()),
          request(`/api/loans?property_id=${propertyId}`, LoanResponseSchema.array()),
        ]);

        const potential_rent = (rentRes.data || []).reduce((s, u) => s + (u.monthly_rent || 0), 0);
        const actual_rent = (rentRes.data || [])
          .filter((u) => u.occupancy_status === 'occupied')
          .reduce((s, u) => s + (u.monthly_rent || 0), 0);
        const monthly_repayment = (loanRes.data || []).reduce(
          (s, l) => s + (l.monthly_payment || 0),
          0
        );
        const monthly_expenses = (expRes.data || [])
          .filter((e) => e.is_recurring && e.recurring_frequency === 'monthly')
          .reduce((s, e) => s + (e.amount || 0), 0);
        const net_cf = actual_rent - monthly_repayment - monthly_expenses;

        const p = propRes.data;
        const detail: PropertyDetail = {
          id: p.id,
          name: p.name,
          address: p.address,
          owner_id: p.user_id,
          property_type: p.property_type,
          year_built: 0,
          total_area: 0,
          purchase_date: p.purchase_date,
          purchase_price: p.purchase_price,
          current_value: p.current_valuation || 0,
          potential_rent,
          actual_rent,
          monthly_repayment,
          monthly_expenses,
          net_cf,
        };
        if (mounted) setProperty(detail);
      } catch (e) {
        console.warn('Failed to load property detail/analytics', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [propertyId]);

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  // Units from API
  const [units, setUnits] = useState<RentRollUnit[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await request(
          `/api/rent-rolls?property_id=${propertyId}`,
          RentRollResponseSchema.array()
        );
        const rentRollUnits: RentRollUnit[] = (data || []).map((u) => ({
          id: u.id,
          property_id: u.property_id,
          property_name: property?.name || '',
          unit_number: u.room_number,
          unit_type: 'residence',
          status: (u.occupancy_status as UnitStatus) || 'vacant',
          area: null,
          bedrooms: null,
          bathrooms: null,
          rent_amount: u.monthly_rent || 0,
          deposit_amount: u.security_deposit || 0,
          current_tenant_name: u.tenant_name || null,
          lease_start_date: u.lease_start_date || null,
          lease_end_date: u.lease_end_date || null,
        }));
        if (mounted) setUnits(rentRollUnits);
      } catch (e) {
        console.warn('Failed to load units', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [propertyId, property?.name]);

  if (!property) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex h-64 items-center justify-center">
            <p>物件情報を読み込み中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col items-start justify-between md:flex-row md:items-center">
          <h1 className="mb-4 text-2xl font-bold text-primary md:mb-0">{property.name}</h1>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="flex items-center"
            >
              <MoreHorizontal className="mr-1" size={16} />
              その他操作
            </Button>
            {showMoreOptions && (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                <a
                  href="/settings/owners"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  所有者変更
                </a>
                <button
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowMoreOptions(false)}
                >
                  物件情報編集
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="bg-primary/10">
              <CardTitle as="h2" className="flex items-center text-lg font-semibold text-primary">
                <Building className="mr-2" size={20} />
                物件概要
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">住所</p>
                  <p>{property.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">物件種別</p>
                  <p>{property.property_type || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">築年数</p>
                  <p>
                    {property.year_built
                      ? `${new Date().getFullYear() - property.year_built}年（${property.year_built}年築）`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">総面積</p>
                  <p>{property.total_area ? `${property.total_area}㎡` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">購入日</p>
                  <p>{formatDate(property.purchase_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">購入価格</p>
                  <p>{formatCurrency(property.purchase_price)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">現在評価額</p>
                  <p>{formatCurrency(property.current_value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="bg-primary/10">
              <CardTitle as="h2" className="flex items-center text-lg font-semibold text-primary">
                <CreditCard className="mr-2" size={20} />
                収支サマリー
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm text-gray-500">月間賃料収入</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(property.actual_rent)}
                  </p>
                  <p className="text-xs text-green-600">
                    満室想定: {formatCurrency(property.potential_rent)}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-gray-500">月間ローン返済</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(property.monthly_repayment)}
                  </p>
                </div>
                <div className="rounded-lg bg-orange-50 p-4">
                  <p className="text-sm text-gray-500">月間支出</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(property.monthly_expenses)}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-gray-500">月間準キャッシュフロー</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(property.net_cf)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full">
          <div className="mb-4 flex rounded-lg border border-border-default p-1">
            <button
              onClick={() => setActiveTab('rentroll')}
              className={`flex items-center rounded px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'rentroll'
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              <Home className="mr-2" size={16} />
              賃貸表
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`flex items-center rounded px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'loans'
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              <CreditCard className="mr-2" size={16} />
              ローン
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center rounded px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'expenses'
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              <Receipt className="mr-2" size={16} />
              支出
            </button>
          </div>

          {activeTab === 'rentroll' && (
            <Card>
              <CardHeader className="bg-primary/10">
                <CardTitle as="h3" className="text-lg font-semibold text-primary">
                  賃貸表
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RentRollTable units={units} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'loans' && (
            <Card>
              <CardHeader className="bg-primary/10">
                <CardTitle as="h3" className="text-lg font-semibold text-primary">
                  ローン情報
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <LoanMiniTable propertyId={propertyId} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'expenses' && (
            <Card>
              <CardHeader className="bg-primary/10">
                <CardTitle as="h3" className="text-lg font-semibold text-primary">
                  支出情報
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PropertyExpenseTable propertyId={propertyId} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
