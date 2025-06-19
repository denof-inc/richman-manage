import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  Property,
  Unit,
  Loan,
  PropertySummary,
  RentRollUnit,
  PropertyDetail,
  Expense,
  LoanRepayment,
  SortDirection,
} from '@/types';

/**
 * Tailwind CSS クラス名をマージする
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 金額を日本円形式でフォーマット
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * 日付を日本語形式でフォーマット
 */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return new Date(dateString).toLocaleDateString('ja-JP', options || defaultOptions);
}

/**
 * 短縮形の日付フォーマット（月/日）
 */
export function formatDateShort(dateString: string): string {
  return formatDate(dateString, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * パーセンテージを日本語形式でフォーマット
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 物件データからサマリーを計算
 */
export function calculatePropertySummary(
  property: Property,
  units: Unit[],
  loans: Loan[],
  expenses: Expense[]
): PropertySummary {
  // 潜在家賃と実際の家賃を計算
  const potential_rent = units.reduce((sum, unit) => sum + (unit.rent_amount || 0), 0);
  const actual_rent = units
    .filter((unit) => unit.status === 'occupied')
    .reduce((sum, unit) => sum + (unit.rent_amount || 0), 0);

  // 月次ローン返済額を計算
  const monthly_repayment = loans.reduce((sum, loan) => sum + loan.payment_amount, 0);

  // 月次経費を計算
  const monthly_expenses = expenses
    .filter((expense) => expense.is_recurring && expense.recurring_frequency === 'monthly')
    .reduce((sum, expense) => sum + expense.amount, 0);

  // ネットキャッシュフロー = 実際の家賃 - ローン返済 - 経費
  const net_cf = actual_rent - monthly_repayment - monthly_expenses;

  return {
    id: property.id,
    name: property.name,
    address: property.address,
    potential_rent,
    actual_rent,
    monthly_repayment,
    net_cf,
    owner_id: property.owner_id,
  };
}

/**
 * レントロール用のユニットデータを変換
 */
export function transformToRentRollUnit(unit: Unit, propertyName: string): RentRollUnit {
  return {
    id: unit.id,
    property_id: unit.property_id,
    property_name: propertyName,
    unit_number: unit.unit_number,
    unit_type: unit.unit_type,
    status: unit.status,
    area: unit.area,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    rent_amount: unit.rent_amount,
    current_tenant_name: unit.current_tenant_name,
    lease_start_date: unit.lease_start_date,
    lease_end_date: unit.lease_end_date,
  };
}

/**
 * 物件詳細データを計算
 */
export function calculatePropertyDetail(
  property: Property,
  units: Unit[],
  loans: Loan[],
  expenses: Expense[]
): PropertyDetail {
  const summary = calculatePropertySummary(property, units, loans, expenses);
  const occupiedUnits = units.filter((unit) => unit.status === 'occupied').length;
  const totalUnits = units.length;
  const occupancy_rate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  const monthly_expenses = expenses
    .filter((expense) => expense.is_recurring && expense.recurring_frequency === 'monthly')
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    ...property,
    units,
    loans,
    monthly_income: summary.actual_rent,
    monthly_expenses,
    net_cash_flow: summary.net_cf,
    occupancy_rate,
  };
}

/**
 * ローンの残債を計算
 */
export function calculateRemainingBalance(loan: Loan, repayments: LoanRepayment[]): number {
  const totalPrincipalPaid = repayments
    .filter((r) => r.loan_id === loan.id)
    .reduce((sum, r) => sum + r.principal_amount, 0);

  return loan.loan_amount - totalPrincipalPaid;
}

/**
 * 汎用ソート関数
 */
export function sortData<T>(data: T[], field: keyof T, direction: SortDirection): T[] {
  return [...data].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    if (aValue == null || bValue == null) {
      return 0;
    }

    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue, 'ja');
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue), 'ja');
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * 配列をフィルタリング（検索用）
 */
export function filterBySearch<T>(data: T[], searchTerm: string, searchFields: (keyof T)[]): T[] {
  if (!searchTerm.trim()) {
    return data;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();

  return data.filter((item) =>
    searchFields.some((field) => {
      const value = item[field];
      return value != null && String(value).toLowerCase().includes(lowerSearchTerm);
    })
  );
}

/**
 * デバウンス機能
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 空室率を計算
 */
export function calculateVacancyRate(units: Unit[]): number {
  if (units.length === 0) return 0;
  const vacantUnits = units.filter((unit) => unit.status === 'vacant').length;
  return (vacantUnits / units.length) * 100;
}

/**
 * 数値を安全にパース
 */
export function safeParseNumber(value: unknown, defaultValue = 0): number {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * オブジェクトから空の値を除去
 */
export function removeEmptyValues<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      (acc as Record<string, unknown>)[key] = value;
    }
    return acc;
  }, {} as Partial<T>);
}
