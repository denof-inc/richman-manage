'use client';

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@richman/ui';

type RentRollItem = {
  id: string;
  unit_number: string;
  unit_type: string;
  status: string;
  tenant_name: string;
  rent_amount: number;
  lease_start: string;
  lease_end: string;
};

export default function RentRollTable(): React.ReactElement {
  const rentRollData: RentRollItem[] = [
    {
      id: '1',
      unit_number: '101',
      unit_type: 'residence',
      status: 'occupied',
      tenant_name: '山田太郎',
      rent_amount: 120000,
      lease_start: '2023-01-01',
      lease_end: '2024-12-31',
    },
    {
      id: '2',
      unit_number: '102',
      unit_type: 'residence',
      status: 'occupied',
      tenant_name: '佐藤花子',
      rent_amount: 115000,
      lease_start: '2023-03-15',
      lease_end: '2025-03-14',
    },
    {
      id: '3',
      unit_number: '103',
      unit_type: 'residence',
      status: 'vacant',
      tenant_name: '',
      rent_amount: 125000,
      lease_start: '',
      lease_end: '',
    },
    {
      id: '4',
      unit_number: 'P1',
      unit_type: 'parking',
      status: 'occupied',
      tenant_name: '鈴木一郎',
      rent_amount: 25000,
      lease_start: '2023-06-01',
      lease_end: '2024-05-31',
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>部屋番号</TableHead>
            <TableHead>タイプ</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>入居者</TableHead>
            <TableHead className="text-right">賃料</TableHead>
            <TableHead>契約開始</TableHead>
            <TableHead>契約終了</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rentRollData.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.unit_number}</TableCell>
              <TableCell>
                {item.unit_type === 'residence'
                  ? '居住'
                  : item.unit_type === 'parking'
                    ? '駐車場'
                    : item.unit_type}
              </TableCell>
              <TableCell>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    item.status === 'occupied'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {item.status === 'occupied' ? '入居中' : '空室'}
                </span>
              </TableCell>
              <TableCell>{item.tenant_name || '-'}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.rent_amount)}</TableCell>
              <TableCell>{formatDate(item.lease_start)}</TableCell>
              <TableCell>{formatDate(item.lease_end)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
