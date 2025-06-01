'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import RentRollTable from '../../components/rentroll/RentRollTable';
import rentRollData from '../../mock/rentRoll.json';

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

  useEffect(() => {
    setUnits(rentRollData as unknown as RentRollUnit[]);
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">レントロール</h1>
          <p className="mt-2 text-text-muted">全物件の入居状況と家賃情報を管理</p>
        </div>

        <RentRollTable units={units} />
      </div>
    </MainLayout>
  );
}
