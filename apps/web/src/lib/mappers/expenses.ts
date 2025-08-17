import type { CreateExpense, UpdateExpense } from '@/lib/api/schemas/expense';

// recurring_frequency('monthly'|'quarterly'|'annually') ⇄ recurring_interval_months(1|3|12)
const freqToInterval: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  annually: 12,
};

const intervalToFreq: Record<number, string> = {
  1: 'monthly',
  3: 'quarterly',
  12: 'annually',
};

type DbExpenseInsert = {
  property_id: string;
  expense_date: string;
  category: string;
  amount: number;
  vendor?: string | null; // 旧スキーマ互換
  vendor_name?: string | null; // 新スキーマ互換
  description?: string | null;
  receipt_url?: string | null; // 旧スキーマ互換
  receipt_file_url?: string | null; // 新スキーマ互換
  is_recurring: boolean;
  recurring_frequency?: string | null; // 旧スキーマ互換
  recurring_interval_months?: number | null; // 新スキーマ互換
};

type DbExpenseUpdate = Partial<DbExpenseInsert> & { updated_at?: string };

export function mapExpenseDtoToDbForCreate(input: CreateExpense): DbExpenseInsert {
  const interval = input.recurring_frequency
    ? (freqToInterval[input.recurring_frequency] ?? null)
    : null;

  return {
    property_id: input.property_id,
    expense_date: input.expense_date,
    category: input.category,
    amount: input.amount,
    vendor: input.vendor ?? null,
    vendor_name: input.vendor ?? null,
    description: input.description ?? null,
    receipt_url: input.receipt_url ?? null,
    receipt_file_url: input.receipt_url ?? null,
    is_recurring: input.is_recurring ?? false,
    recurring_frequency: input.recurring_frequency ?? null,
    recurring_interval_months: interval,
  };
}

export function mapExpenseDtoToDbForUpdate(input: UpdateExpense): DbExpenseUpdate {
  const out: DbExpenseUpdate = {};
  if (input.property_id !== undefined) out.property_id = input.property_id;
  if (input.expense_date !== undefined) out.expense_date = input.expense_date;
  if (input.category !== undefined) out.category = input.category;
  if (input.amount !== undefined) out.amount = input.amount;
  if (input.vendor !== undefined) {
    out.vendor = input.vendor ?? null;
    out.vendor_name = input.vendor ?? null;
  }
  if (input.description !== undefined) out.description = input.description ?? null;
  if (input.receipt_url !== undefined) {
    out.receipt_url = input.receipt_url ?? null;
    out.receipt_file_url = input.receipt_url ?? null;
  }
  if (input.is_recurring !== undefined) out.is_recurring = input.is_recurring;
  if (input.recurring_frequency !== undefined) {
    out.recurring_frequency = input.recurring_frequency ?? null;
    out.recurring_interval_months = input.recurring_frequency
      ? (freqToInterval[input.recurring_frequency] ?? null)
      : null;
  }
  out.updated_at = new Date().toISOString();
  return out;
}

type DbExpenseRowForMap = {
  vendor?: string | null;
  vendor_name?: string | null;
  receipt_url?: string | null;
  receipt_file_url?: string | null;
  recurring_frequency?: string | null;
  recurring_interval_months?: number | null;
} & Record<string, unknown>;

export function mapExpenseDbToDto(
  input: DbExpenseRowForMap
): Record<string, unknown> & { vendor: string | null; receipt_url: string | null } {
  const vendor = input.vendor ?? input.vendor_name ?? null;
  const receipt = input.receipt_url ?? input.receipt_file_url ?? null;
  const freq =
    input.recurring_frequency ??
    (typeof input.recurring_interval_months === 'number'
      ? intervalToFreq[input.recurring_interval_months]
      : undefined) ??
    null;
  return {
    ...input,
    vendor,
    receipt_url: receipt,
    recurring_frequency: freq,
  };
}
