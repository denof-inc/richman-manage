/**
 * 統一型定義ファイル
 * RichmanManageアプリケーション全体で使用される型定義を一元管理
 */

// 基本型定義
export type OwnerType = 'individual' | 'corporate';
export type UnitType = 'residence' | 'tenant' | 'parking' | 'vending' | 'solar';
export type UnitStatus = 'occupied' | 'vacant';
export type PaymentStatus = 'normal' | 'delayed' | 'delinquent' | 'adjusted';
export type RepaymentMethod = 'principal_equal' | 'principal_and_interest';
export type ExpenseCategory =
  | 'management_fee'
  | 'repair_cost'
  | 'utility'
  | 'insurance'
  | 'tax'
  | 'other';
export type PaymentFrequency = 'monthly' | 'bi-weekly' | 'weekly';
export type InterestType = 'fixed' | 'variable';

// ソート関連
export type SortDirection = 'asc' | 'desc';
export type PropertySortField = 'name' | 'address' | 'purchase_price' | 'current_value';
export type LoanSortField = 'lender_name' | 'loan_amount' | 'interest_rate' | 'end_date';
export type UnitSortField = 'unit_number' | 'unit_type' | 'status' | 'rent_amount';

// エンティティ型定義
export interface Owner {
  id: string;
  type: OwnerType;
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  tax_id?: string;
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  property_type: string;
  year_built?: number;
  total_area?: number;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: UnitType;
  status: UnitStatus;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  rent_amount?: number;
  deposit_amount?: number;
  current_tenant_name?: string;
  lease_start_date?: string;
  lease_end_date?: string;
}

export interface Loan {
  id: string;
  property_id: string;
  lender_name: string;
  loan_amount: number;
  interest_rate: number;
  interest_type: InterestType;
  term_years: number;
  start_date: string;
  end_date: string;
  repayment_method: RepaymentMethod;
  payment_frequency: PaymentFrequency;
  payment_amount: number;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  payment_date: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
}

export interface LoanInterestChange {
  id: string;
  loan_id: string;
  change_date: string;
  previous_rate: number;
  new_rate: number;
  reason?: string;
}

export interface Expense {
  id: string;
  property_id: string;
  expense_date: Date;
  category: ExpenseCategory;
  amount: number;
  vendor?: string;
  description?: string;
  receipt_url?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
}

export interface UnitPaymentRecord {
  id: string;
  unit_id: string;
  payment_date: string;
  amount: number;
  payment_status: PaymentStatus;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
}

// UI表示用の派生型
export interface PropertySummary {
  id: string;
  name: string;
  address: string;
  potential_rent: number;
  actual_rent: number;
  monthly_repayment: number;
  net_cf: number;
  owner_id: string;
}

export interface RentRollUnit {
  id: string;
  property_id: string;
  property_name: string;
  unit_number: string;
  unit_type: UnitType;
  status: UnitStatus;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  rent_amount?: number;
  current_tenant_name?: string;
  lease_start_date?: string;
  lease_end_date?: string;
}

export interface PropertyDetail {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  property_type: string;
  year_built?: number;
  total_area?: number;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  units: Unit[];
  loans: Loan[];
  monthly_income: number;
  monthly_expenses: number;
  net_cash_flow: number;
  occupancy_rate: number;
}

// トランザクション関連
export interface RecentTransaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  property?: string;
}

// フォント設定関連
export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

// フィルター関連
export interface PropertyFilter {
  search?: string;
  owner_id?: string;
  property_type?: string;
}

export interface LoanFilter {
  search?: string;
  property_id?: string;
  lender_name?: string;
  interest_type?: InterestType;
}

export interface UnitFilter {
  search?: string;
  property_id?: string;
  unit_type?: UnitType;
  status?: UnitStatus;
}
