import type { CreateLoanInput, UpdateLoanInput, LoanType } from '@/lib/api/schemas/loan';

// DBのloan_typeとUIのloan_typeの差異を吸収
// UI: 'mortgage' | 'business' | 'personal' | 'other'
// DB(例): 'property_acquisition' | 'business' | 'personal' | 'other'
const uiToDbLoanType: Record<LoanType | 'mortgage', string> = {
  mortgage: 'property_acquisition',
  business: 'business',
  personal: 'personal',
  other: 'other',
};

const dbToUiLoanType: Record<string, LoanType> = {
  property_acquisition: 'mortgage',
  business: 'business',
  personal: 'personal',
  other: 'other',
};

type DbLoanInsert = {
  property_id: string;
  lender_name: string;
  loan_type: string;
  principal_amount: number;
  current_balance: number;
  // DBの列差異を吸収: interest_rate もしくは initial_interest_rate/current_interest_rate
  interest_rate?: number;
  initial_interest_rate?: number;
  current_interest_rate?: number;
  loan_term_months: number;
  monthly_payment: number;
};

type DbLoanUpdate = Partial<Omit<DbLoanInsert, 'property_id' | 'principal_amount'>> & {
  updated_at?: string;
};

// 可能なら initial/current 両方を埋めるが、未知列を送るとエラーになるため、
// 呼び出し側で最終的に存在カラムのみを選択して利用する想定。
export function mapLoanDtoToDbForCreate(input: CreateLoanInput): DbLoanInsert {
  const mapped: DbLoanInsert = {
    property_id: input.property_id,
    lender_name: input.lender_name,
    loan_type: uiToDbLoanType[input.loan_type] ?? 'other',
    principal_amount: input.principal_amount,
    current_balance: input.current_balance,
    interest_rate: input.interest_rate, // 既存スキーマ互換
    initial_interest_rate: input.interest_rate, // 新スキーマ互換（存在時）
    current_interest_rate: input.interest_rate, // 新スキーマ互換（存在時）
    loan_term_months: input.loan_term_months,
    monthly_payment: input.monthly_payment,
  };
  return mapped;
}

export function mapLoanDtoToDbForUpdate(input: Partial<UpdateLoanInput>): DbLoanUpdate {
  const out: DbLoanUpdate = {};
  if (input.lender_name !== undefined) out.lender_name = input.lender_name;
  if (input.loan_type !== undefined) out.loan_type = uiToDbLoanType[input.loan_type] ?? 'other';
  if (input.current_balance !== undefined) out.current_balance = input.current_balance;
  if (input.interest_rate !== undefined) {
    out.interest_rate = input.interest_rate; // 既存スキーマ互換
    out.initial_interest_rate = input.interest_rate; // 新スキーマ互換
    out.current_interest_rate = input.interest_rate; // 新スキーマ互換
  }
  if (input.monthly_payment !== undefined) out.monthly_payment = input.monthly_payment;
  out.updated_at = new Date().toISOString();
  return out;
}

type DbLoanRowForMap = {
  loan_type?: string;
  interest_rate?: number | null;
  current_interest_rate?: number | null;
  initial_interest_rate?: number | null;
} & Record<string, unknown>;

export function mapLoanDbToDto(
  input: DbLoanRowForMap
): Record<string, unknown> & { loan_type: LoanType; interest_rate: number } {
  const uiType = input.loan_type ? (dbToUiLoanType[input.loan_type] ?? 'other') : 'other';
  const rate =
    (typeof input.interest_rate === 'number' ? input.interest_rate : undefined) ??
    (typeof input.current_interest_rate === 'number' ? input.current_interest_rate : undefined) ??
    (typeof input.initial_interest_rate === 'number' ? input.initial_interest_rate : undefined) ??
    0;
  return {
    ...input,
    loan_type: uiType,
    interest_rate: rate,
  };
}
