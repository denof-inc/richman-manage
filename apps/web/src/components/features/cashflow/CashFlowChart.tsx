'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { CashFlowData } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface CashFlowChartProps {
  data: CashFlowData[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

/**
 * キャッシュフロー分析チャートコンポーネント
 * ComposedChartを使用して収入（棒グラフ）、支出（棒グラフ）、累計CF（線グラフ）を表示
 * 40-50歳ユーザー向けアクセシビリティ配慮済み
 */
export default function CashFlowChart({
  data,
  height = 400,
  showLegend = true,
  showGrid = true,
}: CashFlowChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  // レスポンシブ対応：画面サイズの監視
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // 初期チェック
    checkIsMobile();

    // リサイズイベントリスナー
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  // データを変換：収入・支出・累計CFを分離
  const chartData = data.map((item) => ({
    period: item.period,
    totalIncome: item.income.rent + item.income.other,
    totalExpenses: Object.values(item.expenses).reduce((sum, val) => sum + val, 0),
    cumulativeCashFlow: item.cumulative_cash_flow,
    // 詳細データも保持（ツールチップで使用）
    income: item.income,
    expenses: item.expenses,
    operatingProfit: item.operating_profit,
    preTaxProfit: item.pre_tax_profit,
    postTaxProfit: item.post_tax_profit,
  }));

  // カスタムツールチップコンポーネント（アクセシビリティ重視）
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: {
        totalIncome: number;
        totalExpenses: number;
        cumulativeCashFlow: number;
        income: { rent: number; other: number };
        expenses: {
          loan_principal: number;
          loan_interest: number;
          management_fee: number;
          property_tax: number;
          repair_cost: number;
          utility: number;
          insurance: number;
          other_expenses: number;
        };
        operatingProfit: number;
        preTaxProfit: number;
        postTaxProfit: number;
      };
    }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div
        className="rounded-lg border border-border-default bg-white p-4 shadow-lg"
        role="tooltip"
        aria-label={`${label}の詳細データ`}
      >
        <h3 className="mb-2 font-semibold text-primary">{label}</h3>

        <div className="space-y-2 text-sm">
          {/* 収入詳細 */}
          <div>
            <div className="mb-1 font-medium text-accent">
              収入：{formatCurrency(data.totalIncome)}
            </div>
            <div className="ml-2 text-text-muted">
              <div>家賃収入：{formatCurrency(data.income.rent)}</div>
              <div>その他収入：{formatCurrency(data.income.other)}</div>
            </div>
          </div>

          {/* 支出詳細 */}
          <div>
            <div className="mb-1 font-medium text-red-600">
              支出：{formatCurrency(data.totalExpenses)}
            </div>
            <div className="ml-2 text-text-muted">
              <div>元本返済：{formatCurrency(data.expenses.loan_principal)}</div>
              <div>利息：{formatCurrency(data.expenses.loan_interest)}</div>
              <div>管理費：{formatCurrency(data.expenses.management_fee)}</div>
              <div>固定資産税：{formatCurrency(data.expenses.property_tax)}</div>
              <div>修繕費：{formatCurrency(data.expenses.repair_cost)}</div>
            </div>
          </div>

          {/* 利益詳細 */}
          <div className="border-t pt-2">
            <div>営業利益：{formatCurrency(data.operatingProfit)}</div>
            <div>税引前利益：{formatCurrency(data.preTaxProfit)}</div>
            <div>税引後利益：{formatCurrency(data.postTaxProfit)}</div>
            <div className="font-medium">累計CF：{formatCurrency(data.cumulativeCashFlow)}</div>
          </div>
        </div>
      </div>
    );
  };

  // カスタム凡例コンポーネント（読みやすさ重視・レスポンシブ対応）
  const CustomLegend = ({
    payload,
  }: {
    payload?: Array<{
      value: string;
      type: string;
      color: string;
    }>;
  }) => {
    if (!payload) return null;

    return (
      <div
        className={`flex flex-wrap justify-center ${isMobile ? 'mt-3 gap-3' : 'mt-4 gap-6'}`}
        role="list"
        aria-label="グラフの凡例"
      >
        {payload.map((entry, index: number) => (
          <div key={index} className="flex items-center gap-2" role="listitem">
            <div
              className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} rounded-sm`}
              style={{
                backgroundColor: entry.type === 'line' ? 'transparent' : entry.color,
                borderLeft: entry.type === 'line' ? `3px solid ${entry.color}` : 'none',
              }}
            />
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-text-secondary font-medium`}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{
            top: isMobile ? 15 : 20,
            right: isMobile ? 20 : 30,
            left: isMobile ? 15 : 20,
            bottom: isMobile ? 10 : 5,
          }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />}

          {/* X軸（期間） - レスポンシブ対応 */}
          <XAxis
            dataKey="period"
            axisLine={{ stroke: '#64748b', strokeWidth: 1 }}
            tickLine={{ stroke: '#64748b' }}
            tick={{
              fontSize: isMobile ? 10 : 12,
              fill: '#64748b',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            height={isMobile ? 50 : 60}
            interval={isMobile ? 1 : 0}
            angle={isMobile ? -60 : -45}
            textAnchor="end"
          />

          {/* 左Y軸（金額） - レスポンシブ対応 */}
          <YAxis
            yAxisId="left"
            axisLine={{ stroke: '#64748b', strokeWidth: 1 }}
            tickLine={{ stroke: '#64748b' }}
            tick={{
              fontSize: isMobile ? 10 : 12,
              fill: '#64748b',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            tickFormatter={(value) =>
              isMobile ? `${Math.round(value / 10000)}万` : `¥${Math.round(value / 10000)}万`
            }
            width={isMobile ? 60 : 80}
          />

          {/* 右Y軸（累計キャッシュフロー） - レスポンシブ対応 */}
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={{ stroke: '#3b82f6', strokeWidth: 1 }}
            tickLine={{ stroke: '#3b82f6' }}
            tick={{
              fontSize: isMobile ? 10 : 12,
              fill: '#3b82f6',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            tickFormatter={(value) =>
              isMobile ? `${Math.round(value / 10000)}万` : `¥${Math.round(value / 10000)}万`
            }
            width={isMobile ? 60 : 80}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }} />

          {showLegend && (
            <Legend content={<CustomLegend />} wrapperStyle={{ paddingTop: '20px' }} />
          )}

          {/* ゼロライン */}
          <ReferenceLine yAxisId="right" y={0} stroke="#9ca3af" strokeDasharray="2 2" />

          {/* 収入バー（緑系） */}
          <Bar
            yAxisId="left"
            dataKey="totalIncome"
            name="総収入"
            fill="#10b981"
            opacity={0.8}
            radius={[2, 2, 0, 0]}
          />

          {/* 支出バー（赤系） */}
          <Bar
            yAxisId="left"
            dataKey="totalExpenses"
            name="総支出"
            fill="#ef4444"
            opacity={0.8}
            radius={[2, 2, 0, 0]}
          />

          {/* 累計キャッシュフロー線（青系） */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeCashFlow"
            name="累計キャッシュフロー"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
