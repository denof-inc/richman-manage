import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

function ensureDev(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }
  const token = request.headers.get('x-seed-token');
  if (!process.env.DEV_SEED_TOKEN || token !== process.env.DEV_SEED_TOKEN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const guard = ensureDev(request);
  if (guard) return guard;

  const admin = createAdminClient();

  try {
    // 1) ユーザー作成（既存なら取得）
    const email = process.env.DEV_SEED_EMAIL || `devuser+${Date.now()}@example.com`;
    const password = process.env.DEV_SEED_PASSWORD || 'DevUser#12345';

    // Supabase Admin APIでユーザー作成（既存時はエラー→拾って検索）
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    let userId = created?.user?.id as string | undefined;
    if (createErr || !userId) {
      // 既存ユーザーの可能性が高いので、ページングして検索
      try {
        let page = 1;
        const perPage = 1000;
        for (; page <= 10 && !userId; page++) {
          const { data: list } = await admin.auth.admin.listUsers({ page, perPage });
          const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (found) {
            userId = found.id;
            break;
          }
          if (list.users.length < perPage) break; // これ以上ページなし
        }
      } catch {
        // 無視して次の判定へ
      }
    }
    if (!userId) {
      throw new Error('テストユーザーの作成/取得に失敗しました');
    }

    // 既存ユーザーだった場合でも、固定パスワードでログインできるように更新
    try {
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
    } catch {
      // ここでの失敗は致命ではない（古いパスワードの可能性が残るため、返却credentialsで齟齬があれば再度updateを検討）
    }

    // reset=1 の場合、当該ユーザーの既存データを削除
    const reset = request.nextUrl.searchParams.get('reset') === '1';
    if (reset) {
      // ユーザーの物件IDを取得
      const { data: props, error: propsErr } = await admin
        .from('properties')
        .select('id')
        .eq('user_id', userId);
      if (propsErr) {
        return NextResponse.json(
          { error: 'Reset failed at properties fetch', details: propsErr },
          { status: 500 }
        );
      }
      const ids = (props || []).map((p: Record<string, unknown>) => p.id as string);
      if (ids.length > 0) {
        // 参照順に削除
        await admin.from('expenses').delete().in('property_id', ids);
        await admin.from('rent_rolls').delete().in('property_id', ids);
        await admin.from('loans').delete().in('property_id', ids);
      }
      await admin.from('properties').delete().eq('user_id', userId);
    }

    // 2) データ投入（properties/loans/rent_rolls/expenses）
    const propertyPayload: Record<string, unknown> = {
      user_id: userId,
      name: '青山マンション',
      address: '東京都港区南青山1-1-1',
      // より厳しいスキーマに合わせて任意/必須になり得る項目を付与
      postal_code: '107-0062',
      prefecture: '東京都',
      city: '港区',
      building_name: '青山マンション',
      construction_year: 1998,
      construction_month: 5,
      total_units: 10,
      land_area: 120.5,
      building_area: 280.3,
      property_type: 'apartment',
      purchase_price: 80000000,
      purchase_date: '2022-05-15',
      current_valuation: 85000000,
      valuation_date: '2024-12-01',
    };
    const { data: property, error: propErr } = await admin
      .from('properties')
      .insert(propertyPayload)
      .select()
      .single();
    if (propErr) {
      return NextResponse.json(
        {
          error: 'Seed failed at properties',
          details: propErr,
        },
        { status: 500 }
      );
    }

    const loansPayload = [
      {
        property_id: property.id,
        loan_name: 'みずほ 第一ローン',
        loan_type: 'property_acquisition',
        lender_name: 'みずほ銀行',
        principal_amount: 40000000,
        interest_type: 'fixed',
        initial_interest_rate: 1.2,
        loan_term_months: 420,
        contract_date: '2021-12-20',
        disbursement_date: '2022-01-10',
        first_payment_date: '2022-02-01',
        final_payment_date: '2057-01-01',
        monthly_payment: 120000,
        current_balance: 35000000,
        last_payment_date: null,
      },
      {
        property_id: property.id,
        loan_name: 'UFJ 第二ローン',
        loan_type: 'property_acquisition',
        lender_name: '三菱UFJ銀行',
        principal_amount: 30000000,
        interest_type: 'variable',
        initial_interest_rate: 2.1,
        loan_term_months: 240,
        contract_date: '2023-01-20',
        disbursement_date: '2023-02-10',
        first_payment_date: '2023-03-01',
        final_payment_date: '2043-02-01',
        monthly_payment: 180000,
        current_balance: 25000000,
        last_payment_date: null,
      },
    ];
    const warnings: string[] = [];
    {
      const { error: loanErr } = await admin.from('loans').insert(loansPayload);
      if (loanErr) warnings.push(`loans insert failed: ${loanErr.message || loanErr}`);
    }

    const rentRollsPayload = [
      {
        property_id: property.id,
        room_number: '101',
        room_status: 'occupied',
        monthly_rent: 120000,
        deposit_months: 2.0,
        key_money_months: 1.0,
        current_tenant_name: '山田太郎',
        lease_start_date: '2023-01-01',
        lease_end_date: null,
      },
      {
        property_id: property.id,
        room_number: '102',
        room_status: 'vacant',
        monthly_rent: 0,
        deposit_months: 0,
        key_money_months: 0,
        current_tenant_name: null,
        lease_start_date: null,
        lease_end_date: null,
      },
    ];
    {
      const { error: rentErr } = await admin.from('rent_rolls').insert(rentRollsPayload);
      if (rentErr) warnings.push(`rent_rolls insert failed: ${rentErr.message || rentErr}`);
    }

    const expensesPayload = [
      {
        property_id: property.id,
        expense_date: new Date().toISOString(),
        category: 'management_fee',
        amount: 25000,
        description: '共用部管理費',
      },
      {
        property_id: property.id,
        expense_date: new Date().toISOString(),
        category: 'repair_cost',
        amount: 80000,
        description: '外壁補修',
      },
    ];
    {
      const { error: expErr } = await admin.from('expenses').insert(expensesPayload);
      if (expErr) warnings.push(`expenses insert failed: ${expErr.message || expErr}`);
    }

    return NextResponse.json(
      {
        message: reset
          ? '開発用データのリセットと再投入が完了しました'
          : '開発用データ投入が完了しました',
        credentials: { email, password },
        warnings: warnings.length ? warnings : undefined,
        hints: 'ログイン画面から上記のメール/パスワードでログインしてください',
      },
      { status: 201 }
    );
  } catch (error) {
    const err = error as Error;
    console.error('Dev seed error:', err);
    return NextResponse.json(
      { error: 'Seed failed', details: err.message || String(err) },
      { status: 500 }
    );
  }
}
