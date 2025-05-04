'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from '@richman/ui';
import { Building, Home, CreditCard, Receipt } from 'lucide-react';

import RentRollTable from '../../../components/rentroll/RentRollTable';
import LoanMiniTable from '../../../components/loans/LoanMiniTable';

import propertySummaryData from '../../../src/mock/propertySummary.json';

type PropertyDetail = {
  id: string;
  name: string;
  address: string;
  monthly_rent: number;
  monthly_repayment: number;
  net_cf: number;
  owner_id?: string;
  property_type?: string;
  year_built?: number;
  total_area?: number;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
};

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [activeTab, setActiveTab] = useState('rentroll');
  const [owners] = useState([
    { id: '1', name: '個人所有' },
    { id: '2', name: '法人所有' },
  ]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('1');

  useEffect(() => {
    const foundProperty = propertySummaryData.find((p) => p.id === propertyId);
    if (foundProperty) {
      setProperty({
        ...foundProperty,
        owner_id: '1',
        property_type: 'マンション',
        year_built: 2015,
        total_area: 500,
        purchase_date: '2020-05-15',
        purchase_price: 80000000,
        current_value: 85000000,
      });
    }
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

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <p>物件情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col items-start justify-between md:flex-row md:items-center">
        <h1 className="text-primary mb-4 text-2xl font-bold md:mb-0">{property.name}</h1>
        <div className="flex items-center space-x-2">
          <select
            value={selectedOwnerId}
            onChange={(e) => setSelectedOwnerId(e.target.value)}
            className="rounded border px-3 py-1 text-sm"
          >
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm">
            所有者変更
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="bg-primary/10">
            <CardTitle className="text-primary flex items-center">
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
            <CardTitle className="text-primary flex items-center">
              <CreditCard className="mr-2" size={20} />
              収支サマリー
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-gray-500">月間賃料収入</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(property.monthly_rent)}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-gray-500">月間ローン返済</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(property.monthly_repayment)}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-gray-500">月間純キャッシュフロー</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(property.net_cf)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="rentroll" className="flex items-center">
            <Home className="mr-2" size={16} />
            賃貸表
          </TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center">
            <CreditCard className="mr-2" size={16} />
            ローン
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center">
            <Receipt className="mr-2" size={16} />
            経費
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rentroll">
          <Card>
            <CardHeader className="bg-primary/10">
              <CardTitle className="text-primary">賃貸表</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RentRollTable propertyId={propertyId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card>
            <CardHeader className="bg-primary/10">
              <CardTitle className="text-primary">ローン情報</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <LoanMiniTable propertyId={propertyId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader className="bg-primary/10">
              <CardTitle className="text-primary">経費情報</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="py-8 text-center text-gray-500">経費情報は現在開発中です</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
