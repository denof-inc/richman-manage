import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { CashFlowData, CashFlowPeriod } from '@/types';

// リクエストバリデーションスキーマ
const CashFlowQuerySchema = z.object({
  period_type: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  property_ids: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
});

/**
 * キャッシュフローデータを取得するAPI
 * GET /api/cashflow
 */
export async function GET(request: NextRequest) {
  try {
    // パラメータの取得とバリデーション
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      period_type: searchParams.get('period_type') || 'monthly',
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      property_ids: searchParams.get('property_ids'),
    };

    const validatedParams = CashFlowQuerySchema.parse(queryParams);

    // Supabase認証
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    // ユーザー認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // キャッシュフローデータの集計
    const cashFlowData = await aggregateCashFlowData(
      supabase as unknown as SupabaseClient,
      user.id,
      validatedParams
    );

    return NextResponse.json({
      success: true,
      data: cashFlowData,
    });
  } catch (error) {
    console.error('キャッシュフロー取得エラー:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * キャッシュフローデータの集計処理
 */
interface SupabaseClient {
  rpc: (
    functionName: string,
    params: { query: string; params: string[] }
  ) => Promise<{ data: unknown[] | null; error: unknown }>;
}

async function aggregateCashFlowData(
  supabase: SupabaseClient,
  userId: string,
  params: z.infer<typeof CashFlowQuerySchema>
): Promise<CashFlowData[]> {
  const { period_type, start_date, end_date, property_ids } = params;

  // 期間のフォーマット設定
  const dateFormat = getDateFormat(period_type);
  const periodTrunc = getPeriodTrunc(period_type);

  // 基本クエリ条件
  const propertyFilter = property_ids ? `AND p.id = ANY('{${property_ids.join(',')}}')` : '';

  // 収入データの取得（レントロールから）
  const incomeQuery = `
    SELECT 
      DATE_TRUNC('${periodTrunc}', rr.created_at) as period_date,
      TO_CHAR(DATE_TRUNC('${periodTrunc}', rr.created_at), '${dateFormat}') as period,
      SUM(CASE WHEN rr.occupancy_status = 'occupied' THEN rr.monthly_rent ELSE 0 END) as rent_income,
      0 as other_income
    FROM rent_rolls rr
    JOIN properties p ON rr.property_id = p.id
    JOIN owners o ON p.owner_id = o.id
    WHERE o.user_id = $1
      AND rr.created_at >= $2
      AND rr.created_at <= $3
      ${propertyFilter}
    GROUP BY DATE_TRUNC('${periodTrunc}', rr.created_at)
    ORDER BY period_date
  `;

  // 支出データの取得（支出テーブルから）
  const expenseQuery = `
    SELECT 
      DATE_TRUNC('${periodTrunc}', e.expense_date) as period_date,
      TO_CHAR(DATE_TRUNC('${periodTrunc}', e.expense_date), '${dateFormat}') as period,
      SUM(CASE WHEN e.category = 'management_fee' THEN e.amount ELSE 0 END) as management_fee,
      SUM(CASE WHEN e.category = 'repair_cost' THEN e.amount ELSE 0 END) as repair_cost,
      SUM(CASE WHEN e.category = 'utility' THEN e.amount ELSE 0 END) as utility,
      SUM(CASE WHEN e.category = 'insurance' THEN e.amount ELSE 0 END) as insurance,
      SUM(CASE WHEN e.category = 'tax' THEN e.amount ELSE 0 END) as property_tax,
      SUM(CASE WHEN e.category = 'other' THEN e.amount ELSE 0 END) as other_expenses
    FROM expenses e
    JOIN properties p ON e.property_id = p.id
    JOIN owners o ON p.owner_id = o.id
    WHERE o.user_id = $1
      AND e.expense_date >= $2
      AND e.expense_date <= $3
      ${propertyFilter}
      AND e.deleted_at IS NULL
    GROUP BY DATE_TRUNC('${periodTrunc}', e.expense_date)
    ORDER BY period_date
  `;

  // ローン返済データの取得
  const loanQuery = `
    SELECT 
      DATE_TRUNC('${periodTrunc}', lr.payment_date) as period_date,
      TO_CHAR(DATE_TRUNC('${periodTrunc}', lr.payment_date), '${dateFormat}') as period,
      SUM(lr.principal_amount) as loan_principal,
      SUM(lr.interest_amount) as loan_interest
    FROM loan_repayments lr
    JOIN loans l ON lr.loan_id = l.id
    JOIN properties p ON l.property_id = p.id
    JOIN owners o ON p.owner_id = o.id
    WHERE o.user_id = $1
      AND lr.payment_date >= $2
      AND lr.payment_date <= $3
      ${propertyFilter}
    GROUP BY DATE_TRUNC('${periodTrunc}', lr.payment_date)
    ORDER BY period_date
  `;

  const queryParams = [userId, start_date, end_date];

  try {
    // 並行してデータ取得
    const [incomeResult, expenseResult, loanResult] = await Promise.all([
      supabase.rpc('execute_sql', { query: incomeQuery, params: queryParams }),
      supabase.rpc('execute_sql', { query: expenseQuery, params: queryParams }),
      supabase.rpc('execute_sql', { query: loanQuery, params: queryParams }),
    ]);

    // データのマージと計算
    const periodMap = new Map<string, Partial<CashFlowData> & { period: string }>();

    // 収入データの処理
    (incomeResult.data || []).forEach((row) => {
      const typedRow = row as Record<string, unknown>;
      periodMap.set(String(typedRow.period), {
        period: String(typedRow.period),
        income: {
          rent: Number(typedRow.rent_income) || 0,
          other: Number(typedRow.other_income) || 0,
        },
      });
    });

    // 支出データの処理
    (expenseResult.data || []).forEach((row) => {
      const typedRow = row as Record<string, unknown>;
      const existing = periodMap.get(String(typedRow.period)) || {
        period: String(typedRow.period),
        expenses: {
          loan_principal: 0,
          loan_interest: 0,
          management_fee: 0,
          property_tax: 0,
          repair_cost: 0,
          utility: 0,
          insurance: 0,
          other_expenses: 0,
        },
      };

      if (!existing.expenses) {
        existing.expenses = {
          loan_principal: 0,
          loan_interest: 0,
          management_fee: 0,
          property_tax: 0,
          repair_cost: 0,
          utility: 0,
          insurance: 0,
          other_expenses: 0,
        };
      }

      existing.expenses.management_fee = Number(typedRow.management_fee) || 0;
      existing.expenses.repair_cost = Number(typedRow.repair_cost) || 0;
      existing.expenses.utility = Number(typedRow.utility) || 0;
      existing.expenses.insurance = Number(typedRow.insurance) || 0;
      existing.expenses.property_tax = Number(typedRow.property_tax) || 0;
      existing.expenses.other_expenses = Number(typedRow.other_expenses) || 0;

      periodMap.set(String(typedRow.period), existing);
    });

    // ローンデータの処理
    (loanResult.data || []).forEach((row) => {
      const typedRow = row as Record<string, unknown>;
      const existing = periodMap.get(String(typedRow.period)) || {
        period: String(typedRow.period),
        expenses: {
          loan_principal: 0,
          loan_interest: 0,
          management_fee: 0,
          property_tax: 0,
          repair_cost: 0,
          utility: 0,
          insurance: 0,
          other_expenses: 0,
        },
      };

      if (!existing.expenses) {
        existing.expenses = {
          loan_principal: 0,
          loan_interest: 0,
          management_fee: 0,
          property_tax: 0,
          repair_cost: 0,
          utility: 0,
          insurance: 0,
          other_expenses: 0,
        };
      }

      existing.expenses.loan_principal = Number(typedRow.loan_principal) || 0;
      existing.expenses.loan_interest = Number(typedRow.loan_interest) || 0;

      periodMap.set(String(typedRow.period), existing);
    });

    // 最終計算と結果生成
    const result: CashFlowData[] = [];
    let cumulativeCashFlow = 0;

    Array.from(periodMap.values())
      .sort((a, b) => (a.period || '').localeCompare(b.period || ''))
      .forEach((data) => {
        const income = data.income || { rent: 0, other: 0 };
        const expenses = data.expenses || {
          loan_principal: 0,
          loan_interest: 0,
          management_fee: 0,
          property_tax: 0,
          repair_cost: 0,
          utility: 0,
          insurance: 0,
          other_expenses: 0,
        };

        const totalIncome = income.rent + income.other;
        const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
        const operatingProfit =
          totalIncome - (totalExpenses - expenses.loan_principal - expenses.loan_interest);
        const preTaxProfit = operatingProfit - expenses.loan_interest;
        const postTaxProfit = Math.floor(preTaxProfit * 0.8); // 簡易税率20%

        cumulativeCashFlow += postTaxProfit;

        result.push({
          period: data.period || '',
          income,
          expenses,
          operating_profit: operatingProfit,
          pre_tax_profit: preTaxProfit,
          post_tax_profit: postTaxProfit,
          cumulative_cash_flow: cumulativeCashFlow,
        });
      });

    return result;
  } catch (error) {
    console.error('データ集計エラー:', error);
    throw error;
  }
}

/**
 * 期間タイプに応じた日付フォーマットを取得
 */
function getDateFormat(periodType: CashFlowPeriod): string {
  switch (periodType) {
    case 'monthly':
      return 'YYYY-MM';
    case 'quarterly':
      return 'YYYY-Q';
    case 'yearly':
      return 'YYYY';
    default:
      return 'YYYY-MM';
  }
}

/**
 * 期間タイプに応じたTRUNC関数の値を取得
 */
function getPeriodTrunc(periodType: CashFlowPeriod): string {
  switch (periodType) {
    case 'monthly':
      return 'month';
    case 'quarterly':
      return 'quarter';
    case 'yearly':
      return 'year';
    default:
      return 'month';
  }
}
