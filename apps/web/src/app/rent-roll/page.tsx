'use client';
export const dynamic = 'force-dynamic';
import React, { useCallback, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-context';
import MainLayout from '../../components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RentRollTable from '../../components/rentroll/RentRollTable';
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

export default function RentRollPage() {
  const [units, setUnits] = useState<RentRollUnit[]>([]);
  const { showError } = useToast();

  const load = useCallback(async () => {
    const [rrRes, propsRes] = await Promise.all([
      request('/api/rent-rolls', RentRollResponseSchema.array()),
      request('/api/properties', PropertyResponseSchema.array()),
    ]);
    const propNameMap = new Map<string, string>((propsRes.data || []).map((p) => [p.id, p.name]));
    const rentRollUnits: RentRollUnit[] = (rrRes.data || []).map((unit) => ({
      id: unit.id,
      property_id: unit.property_id,
      property_name: propNameMap.get(unit.property_id) || '',
      unit_number: unit.room_number,
      unit_type: 'residence',
      status: (unit.occupancy_status as UnitStatus) || 'vacant',
      area: null,
      bedrooms: null,
      bathrooms: null,
      rent_amount: unit.monthly_rent || 0,
      deposit_amount: unit.security_deposit || 0,
      current_tenant_name: unit.tenant_name || null,
      lease_start_date: unit.lease_start_date || null,
      lease_end_date: unit.lease_end_date || null,
    }));
    setUnits(rentRollUnits);
  }, []);

  useEffect(() => {
    load().catch(() =>
      showError('レントロールの取得に失敗しました', { label: '再試行', onAction: () => load() })
    );
  }, [load, showError]);

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">レントロール</h1>
            <p className="mt-2 text-text-muted">全物件の入居状況と家賃情報を管理</p>
          </div>

          <RentRollTable units={units} />
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
