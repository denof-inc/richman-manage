'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Calendar, DollarSign, User, Edit } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { request } from '@/lib/api/client';
import { RentRollResponseSchema } from '@/lib/api/schemas/rent-roll';
import { PropertyResponseSchema } from '@/lib/api/schemas/property';

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

// モック家賃履歴データ
type RentHistory = {
  date: string;
  amount: number;
  note: string;
};

// モック入退去履歴データ
type LeaseHistory = {
  id: string;
  tenant_name: string;
  start_date: string;
  end_date: string | null;
  deposit: number;
  status: 'current' | 'completed';
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

export default function RoomDetailPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const roomId = params.roomId as string;

  const [unit, setUnit] = useState<RentRollUnit | null>(null);
  const [rentHistory] = useState<RentHistory[]>([
    { date: '2024-01-01', amount: 180000, note: '契約開始' },
    { date: '2023-04-01', amount: 175000, note: '市場価格調整' },
    { date: '2022-07-01', amount: 170000, note: '初回設定' },
  ]);

  const [leaseHistory] = useState<LeaseHistory[]>([
    {
      id: '1',
      tenant_name: '田中 太郎',
      start_date: '2023-04-01',
      end_date: null,
      deposit: 360000,
      status: 'current',
    },
    {
      id: '2',
      tenant_name: '佐藤 花子',
      start_date: '2022-07-01',
      end_date: '2023-03-31',
      deposit: 340000,
      status: 'completed',
    },
  ]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ data: u }, { data: p }] = await Promise.all([
          request(`/api/rent-rolls/${roomId}`, RentRollResponseSchema),
          request(`/api/properties/${propertyId}`, PropertyResponseSchema),
        ]);
        const mapped: RentRollUnit = {
          id: u.id,
          property_id: u.property_id,
          property_name: p.name,
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
        };
        if (mounted) setUnit(mapped);
      } catch {
        // no-op fallback, unit remains null
      }
    })();
    return () => {
      mounted = false;
    };
  }, [roomId, propertyId]);

  if (!unit) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">部屋が見つかりません</h1>
            <Link href={`/properties/${propertyId}`}>
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                物件詳細に戻る
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          {/* ナビゲーション */}
          <div className="mb-6">
            <Link href={`/properties/${propertyId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                物件詳細に戻る
              </Button>
            </Link>
          </div>

          {/* ページタイトル */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">
              {unit.property_name} - {unit.unit_number}
            </h1>
            <p className="mt-2 text-text-muted">部屋詳細・家賃履歴・入退去記録</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* 左カラム */}
            <div className="space-y-6">
              {/* 基本情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    基本情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-text-muted">部屋番号</label>
                      <p className="text-lg font-semibold text-primary">{unit.unit_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-text-muted">タイプ</label>
                      <p className="text-lg font-semibold text-primary">
                        {getUnitTypeLabel(unit.unit_type)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-text-muted">面積</label>
                      <p className="text-lg font-semibold text-primary">
                        {unit.area ? `${unit.area}㎡` : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-text-muted">間取り</label>
                      <p className="text-lg font-semibold text-primary">
                        {unit.bedrooms ? `${unit.bedrooms}LDK` : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-text-muted">現在の家賃</label>
                        <p
                          className={`text-xl font-bold ${
                            unit.status === 'occupied' ? 'text-accent' : 'text-red-500'
                          }`}
                        >
                          {formatCurrency(unit.rent_amount)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-muted">敷金</label>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(unit.deposit_amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-text-muted">入居状況</label>
                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                          unit.status === 'occupied'
                            ? 'bg-accent text-white'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {unit.status === 'occupied' ? '入居中' : '空室'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 現在の契約情報 */}
              {unit.status === 'occupied' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      現在の契約情報
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-text-muted">入居者名</label>
                      <p className="text-lg font-semibold text-primary">
                        {unit.current_tenant_name || '-'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-text-muted">契約開始日</label>
                        <p className="font-medium">{formatDate(unit.lease_start_date)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-muted">契約終了日</label>
                        <p className="font-medium">{formatDate(unit.lease_end_date)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 右カラム */}
            <div className="space-y-6">
              {/* 家賃履歴 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    家賃履歴
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rentHistory.map((history, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{formatCurrency(history.amount)}</p>
                          <p className="text-sm text-text-muted">{history.note}</p>
                        </div>
                        <div className="text-sm text-text-muted">{formatDate(history.date)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 入退去履歴 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    入退去履歴
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {leaseHistory.map((lease) => (
                      <div key={lease.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-primary">{lease.tenant_name}</p>
                            <p className="text-sm text-text-muted">
                              {formatDate(lease.start_date)} 〜 {formatDate(lease.end_date)}
                            </p>
                            <p className="text-sm text-text-muted">
                              敷金: {formatCurrency(lease.deposit)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              lease.status === 'current'
                                ? 'bg-accent text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {lease.status === 'current' ? '入居中' : '退去済み'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="mt-8 flex gap-4">
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              家賃変更
            </Button>
            <Button variant="outline">
              <User className="mr-2 h-4 w-4" />
              入退去登録
            </Button>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
