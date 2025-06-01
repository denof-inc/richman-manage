'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Users, Home, Car, Zap, ChevronDown, ChevronRight } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'detailed' | 'grouped'>('grouped');
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  const toggleProperty = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
    } else {
      newExpanded.add(propertyId);
    }
    setExpandedProperties(newExpanded);
  };

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

  // 物件ごとにグループ化
  const groupedProperties = properties.map((property) => {
    const propertyUnits = filteredUnits.filter((unit) => unit.property_id === property.id);
    const totalUnits = propertyUnits.length;
    const occupiedUnits = propertyUnits.filter((unit) => unit.status === 'occupied').length;
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // 想定満室家賃（全部屋の家賃合計）
    const potentialRent = propertyUnits.reduce((sum, unit) => sum + unit.rent_amount, 0);

    // 現況満室家賃（入居中の部屋の家賃合計）
    const currentRent = propertyUnits
      .filter((unit) => unit.status === 'occupied')
      .reduce((sum, unit) => sum + unit.rent_amount, 0);

    return {
      ...property,
      units: propertyUnits,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      potentialRent,
      currentRent,
    };
  });

  // 初回ロード時に最初の物件を展開
  React.useEffect(() => {
    if (groupedProperties.length > 0 && expandedProperties.size === 0) {
      setExpandedProperties(new Set([groupedProperties[0].id]));
    }
  }, [groupedProperties.length]);

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

      {/* 表示切替ボタン */}
      <div className="flex items-center justify-center">
        <div className="flex rounded-lg border border-border-default p-1">
          <button
            onClick={() => setViewMode('grouped')}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              viewMode === 'grouped' ? 'bg-accent text-white' : 'text-text-muted hover:text-primary'
            }`}
          >
            物件別表示
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              viewMode === 'detailed'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-primary'
            }`}
          >
            詳細表示
          </button>
        </div>
      </div>

      {/* テーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-primary">
              {viewMode === 'detailed'
                ? `レントロール一覧 (${filteredUnits.length}件)`
                : `物件別レントロール (${groupedProperties.length}物件)`}
            </CardTitle>
            <div className="text-sm text-text-muted">月間家賃収入: {formatCurrency(totalRent)}</div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'detailed' ? (
            /* 詳細表示 */
            <>
              {/* モバイル表示: カード形式 */}
              <div className="block space-y-3 md:hidden">
                {filteredUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className="rounded-lg border border-border-default bg-white p-4"
                  >
                    {/* ヘッダー部分 */}
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center space-x-2">
                          <span className="text-lg font-medium text-primary">
                            {unit.property_name}
                          </span>
                          <span className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600">
                            {unit.unit_number}
                          </span>
                        </div>
                        <div className="mb-2 flex items-center space-x-2">
                          {getUnitTypeIcon(unit.unit_type)}
                          <span className="text-sm text-text-muted">
                            {getUnitTypeLabel(unit.unit_type)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          unit.status === 'occupied'
                            ? 'bg-accent text-white'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {unit.status === 'occupied' ? '入居中' : '空室'}
                      </span>
                    </div>

                    {/* 詳細情報 */}
                    <div className="space-y-2 border-t pt-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">面積</span>
                        <span>
                          {unit.area ? `${unit.area}㎡` : '-'}
                          {unit.bedrooms && (
                            <span className="ml-1 text-text-muted">({unit.bedrooms}LDK)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">家賃</span>
                        <span
                          className={`font-medium ${
                            unit.status === 'occupied' ? 'text-accent' : 'text-red-500'
                          }`}
                        >
                          {formatCurrency(unit.rent_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">入居者</span>
                        <span>{unit.current_tenant_name || '-'}</span>
                      </div>
                      {unit.lease_start_date && unit.lease_end_date && (
                        <div className="flex justify-between">
                          <span className="text-text-muted">契約期間</span>
                          <span className="text-right text-xs">
                            {formatDate(unit.lease_start_date)}
                            <br />〜 {formatDate(unit.lease_end_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* アクションボタン */}
                    <div className="mt-3 border-t pt-3 text-right">
                      <Link href={`/rent-roll/${unit.id}`}>
                        <Button variant="outline" size="sm">
                          詳細
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}

                {filteredUnits.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-text-muted">条件に一致する部屋がありません</p>
                  </div>
                )}
              </div>

              {/* デスクトップ表示: テーブル形式 */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="p-3 text-left text-sm font-medium text-text-muted">
                        物件・部屋
                      </th>
                      <th className="p-3 text-left text-sm font-medium text-text-muted">タイプ</th>
                      <th className="p-3 text-left text-sm font-medium text-text-muted">状況</th>
                      <th className="p-3 text-left text-sm font-medium text-text-muted">面積</th>
                      <th className="p-3 text-left text-sm font-medium text-text-muted">家賃</th>
                      <th className="p-3 text-left text-sm font-medium text-text-muted">入居者</th>
                      <th className="p-3 text-left text-sm font-medium text-text-muted">
                        契約期間
                      </th>
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
                          <div
                            className={`font-medium ${
                              unit.status === 'occupied' ? 'text-accent' : 'text-red-500'
                            }`}
                          >
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

                {filteredUnits.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-text-muted">条件に一致する部屋がありません</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* 物件別表示 */
            <div className="space-y-6">
              {groupedProperties.map((property) => (
                <div key={property.id} className="rounded-lg border border-border-default">
                  {/* 物件ヘッダー - クリッカブル */}
                  <button
                    onClick={() => toggleProperty(property.id)}
                    className="w-full bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
                          <h3 className="text-lg font-semibold text-primary">{property.name}</h3>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-text-muted">
                              入居率:{' '}
                              <span className="font-medium text-accent">
                                {property.occupancyRate.toFixed(1)}%
                              </span>
                            </span>
                            <span className="text-text-muted">
                              ({property.occupiedUnits}/{property.totalUnits}室)
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-col space-y-1 text-sm md:flex-row md:items-center md:space-x-6 md:space-y-0">
                          <div className="text-text-muted">
                            想定満室家賃:{' '}
                            <span className="font-medium text-primary">
                              {formatCurrency(property.potentialRent)}
                            </span>
                          </div>
                          <div className="text-text-muted">
                            現況満室家賃:{' '}
                            <span className="font-medium text-accent">
                              {formatCurrency(property.currentRent)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {expandedProperties.has(property.id) ? (
                          <ChevronDown className="h-5 w-5 text-text-muted" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-text-muted" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* 部屋一覧 - 展開時のみ表示 */}
                  {expandedProperties.has(property.id) && (
                    <>
                      <div className="block md:hidden">
                        {/* モバイル表示: カード形式 */}
                        <div className="space-y-3 p-4">
                          {property.units.map((unit) => (
                            <div
                              key={unit.id}
                              className="rounded-lg border border-border-default bg-white p-3"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="font-medium text-primary">{unit.unit_number}</div>
                                  {getUnitTypeIcon(unit.unit_type)}
                                  <span className="text-sm text-text-muted">
                                    {getUnitTypeLabel(unit.unit_type)}
                                  </span>
                                </div>
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                    unit.status === 'occupied'
                                      ? 'bg-accent text-white'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {unit.status === 'occupied' ? '入居中' : '空室'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-text-muted">面積: </span>
                                  <span>{unit.area ? `${unit.area}㎡` : '-'}</span>
                                  {unit.bedrooms && (
                                    <span className="ml-1 text-xs text-text-muted">
                                      ({unit.bedrooms}LDK)
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-text-muted">家賃: </span>
                                  <span
                                    className={`font-medium ${
                                      unit.status === 'occupied' ? 'text-accent' : 'text-red-500'
                                    }`}
                                  >
                                    {formatCurrency(unit.rent_amount)}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-text-muted">入居者: </span>
                                  <span>{unit.current_tenant_name || '-'}</span>
                                </div>
                                {unit.lease_start_date && unit.lease_end_date && (
                                  <div className="col-span-2">
                                    <span className="text-text-muted">契約期間: </span>
                                    <span className="text-xs">
                                      {formatDate(unit.lease_start_date)} 〜{' '}
                                      {formatDate(unit.lease_end_date)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 text-right">
                                <Link href={`/rent-roll/${unit.id}`}>
                                  <Button variant="outline" size="sm">
                                    詳細
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="hidden md:block">
                        {/* デスクトップ表示: テーブル形式 */}
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-25 border-b border-border-default">
                                <th className="p-3 text-left text-sm font-medium text-text-muted">
                                  部屋
                                </th>
                                <th className="p-3 text-left text-sm font-medium text-text-muted">
                                  タイプ
                                </th>
                                <th className="p-3 text-left text-sm font-medium text-text-muted">
                                  状況
                                </th>
                                <th className="p-3 text-left text-sm font-medium text-text-muted">
                                  面積
                                </th>
                                <th className="p-3 text-left text-sm font-medium text-text-muted">
                                  家賃
                                </th>
                                <th className="p-3 text-left text-sm font-medium text-text-muted">
                                  入居者
                                </th>
                                <th className="p-3 text-left text-sm font-medium text-text-muted">
                                  契約期間
                                </th>
                                <th className="p-3 text-left text-sm font-medium text-text-muted">
                                  操作
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {property.units.map((unit) => (
                                <tr
                                  key={unit.id}
                                  className="border-b border-border-default transition-colors hover:bg-gray-50"
                                >
                                  <td className="p-3">
                                    <div className="font-medium text-primary">
                                      {unit.unit_number}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center space-x-2">
                                      {getUnitTypeIcon(unit.unit_type)}
                                      <span className="text-sm">
                                        {getUnitTypeLabel(unit.unit_type)}
                                      </span>
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
                                        <div className="text-xs text-text-muted">
                                          {unit.bedrooms}LDK
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div
                                      className={`font-medium ${
                                        unit.status === 'occupied' ? 'text-accent' : 'text-red-500'
                                      }`}
                                    >
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
                      </div>
                    </>
                  )}
                </div>
              ))}

              {groupedProperties.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-text-muted">条件に一致する物件がありません</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
