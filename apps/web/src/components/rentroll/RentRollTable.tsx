'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Users, Home, Car, Zap } from 'lucide-react';

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

interface RentRollTableProps {
  units: RentRollUnit[];
}

const getUnitTypeIcon = (type: UnitType) => {
  switch (type) {
    case 'residence':
      return <Home className="h-4 w-4" />;
    case 'tenant':
      return <Building className="h-4 w-4" />;
    case 'parking':
      return <Car className="h-4 w-4" />;
    case 'vending':
      return <Zap className="h-4 w-4" />;
    case 'solar':
      return <Zap className="h-4 w-4" />;
    default:
      return <Home className="h-4 w-4" />;
  }
};

const getUnitTypeLabel = (type: UnitType) => {
  switch (type) {
    case 'residence':
      return '住居';
    case 'tenant':
      return '店舗';
    case 'parking':
      return '駐車場';
    case 'vending':
      return '自販機';
    case 'solar':
      return 'ソーラー';
    default:
      return type;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function RentRollTable({ units }: RentRollTableProps) {
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // フィルタリング
  const filteredUnits = units.filter((unit) => {
    if (filterProperty !== 'all' && unit.property_id !== filterProperty) return false;
    if (filterStatus !== 'all' && unit.status !== filterStatus) return false;
    if (filterType !== 'all' && unit.unit_type !== filterType) return false;
    return true;
  });

  // 統計計算
  const totalUnits = filteredUnits.length;
  const occupiedUnits = filteredUnits.filter((unit) => unit.status === 'occupied').length;
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  const totalRent = filteredUnits
    .filter((unit) => unit.status === 'occupied')
    .reduce((sum, unit) => sum + unit.rent_amount, 0);

  // ユニークな物件リスト
  const properties = Array.from(
    new Set(units.map((unit) => ({ id: unit.property_id, name: unit.property_name })))
  );

  return (
    <div className="space-y-6">
      {/* 統計サマリー */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-accent" />
              <div>
                <p className="text-sm font-medium text-text-muted">総戸数</p>
                <p className="text-2xl font-bold text-primary">{totalUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-accent" />
              <div>
                <p className="text-sm font-medium text-text-muted">入居中</p>
                <p className="text-2xl font-bold text-primary">{occupiedUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium text-text-muted">空室</p>
                <p className="text-2xl font-bold text-primary">{vacantUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-text-muted">入居率</p>
              <p className="text-2xl font-bold text-accent">{occupancyRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-text-muted">物件</label>
              <select
                value={filterProperty}
                onChange={(e) => setFilterProperty(e.target.value)}
                className="w-full rounded border border-border-default px-3 py-2 text-sm"
              >
                <option value="all">すべて</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-muted">入居状況</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded border border-border-default px-3 py-2 text-sm"
              >
                <option value="all">すべて</option>
                <option value="occupied">入居中</option>
                <option value="vacant">空室</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-muted">タイプ</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded border border-border-default px-3 py-2 text-sm"
              >
                <option value="all">すべて</option>
                <option value="residence">住居</option>
                <option value="tenant">店舗</option>
                <option value="parking">駐車場</option>
                <option value="vending">自販機</option>
                <option value="solar">ソーラー</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* テーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-primary">
              レントロール一覧 ({filteredUnits.length}件)
            </CardTitle>
            <div className="text-sm text-text-muted">月間家賃収入: {formatCurrency(totalRent)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="p-3 text-left text-sm font-medium text-text-muted">物件・部屋</th>
                  <th className="p-3 text-left text-sm font-medium text-text-muted">タイプ</th>
                  <th className="p-3 text-left text-sm font-medium text-text-muted">状況</th>
                  <th className="p-3 text-left text-sm font-medium text-text-muted">面積</th>
                  <th className="p-3 text-left text-sm font-medium text-text-muted">家賃</th>
                  <th className="p-3 text-left text-sm font-medium text-text-muted">入居者</th>
                  <th className="p-3 text-left text-sm font-medium text-text-muted">契約期間</th>
                  <th className="p-3 text-left text-sm font-medium text-text-muted">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => (
                  <tr
                    key={unit.id}
                    className="border-b border-border-default transition-colors hover:bg-gray-50"
                  >
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-primary">{unit.property_name}</div>
                        <div className="text-sm text-text-muted">{unit.unit_number}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        {getUnitTypeIcon(unit.unit_type)}
                        <span className="text-sm">{getUnitTypeLabel(unit.unit_type)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          unit.status === 'occupied'
                            ? 'bg-accent text-white'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {unit.status === 'occupied' ? '入居中' : '空室'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {unit.area ? `${unit.area}㎡` : '-'}
                        {unit.bedrooms && (
                          <div className="text-xs text-text-muted">{unit.bedrooms}LDK</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-primary">
                        {formatCurrency(unit.rent_amount)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">{unit.current_tenant_name || '-'}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {unit.lease_start_date && unit.lease_end_date ? (
                          <>
                            <div>{formatDate(unit.lease_start_date)}</div>
                            <div className="text-xs text-text-muted">
                              〜 {formatDate(unit.lease_end_date)}
                            </div>
                          </>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Link href={`/rent-roll/${unit.id}`}>
                        <Button variant="outline" size="sm">
                          詳細
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUnits.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-text-muted">条件に一致する部屋がありません</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
