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
    if (createErr && createErr.message?.includes('duplicate key')) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === email)?.id;
    }
    if (!userId) {
      throw new Error('テストユーザーの作成/取得に失敗しました');
    }

    // 2) データ投入（properties/loans/rent_rolls/expenses）
    const propertyPayload = {
      user_id: userId,
      name: '青山マンション',
      address: '東京都港区南青山1-1-1',
      property_type: 'apartment',
      purchase_price: 80000000,
      purchase_date: '2022-05-15',
      current_valuation: 85000000,
    };
    const { data: property, error: propErr } = await admin
      .from('properties')
      .insert(propertyPayload)
      .select()
      .single();
    if (propErr) throw propErr;

    // 所有者（デフォルト）
    let ownerId: string | undefined;
    try {
      const { data: owner } = await admin
        .from('owners')
        .insert({ user_id: userId, name: 'デフォルト所有者', owner_kind: 'individual' })
        .select('id')
        .single();
      ownerId = owner?.id as string | undefined;
    } catch {
      // owners未整備でも続行
    }

    const loansPayload = [
      {
        property_id: property.id,
        owner_id: ownerId ?? null,
        lender_name: 'みずほ銀行',
        branch_name: '渋谷支店',
        loan_type: 'mortgage',
        principal_amount: 40000000,
        current_balance: 35000000,
        interest_rate: 1.2,
        loan_term_months: 420,
        monthly_payment: 120000,
        notes: '青山マンション取得時のメインローン',
      },
      {
        property_id: property.id,
        owner_id: ownerId ?? null,
        lender_name: '三菱UFJ銀行',
        branch_name: '青山支店',
        loan_type: 'business',
        principal_amount: 30000000,
        current_balance: 25000000,
        interest_rate: 2.1,
        loan_term_months: 240,
        monthly_payment: 180000,
        notes: '運転資金用途のビジネスローン',
      },
    ];
    const { error: loanErr } = await admin.from('loans').insert(loansPayload);
    if (loanErr) throw loanErr;

    const rentRollsPayload = [
      {
        property_id: property.id,
        room_number: '101',
        occupancy_status: 'occupied',
        monthly_rent: 120000,
        tenant_name: '山田太郎',
        lease_start_date: '2023-01-01T00:00:00Z',
        lease_end_date: null,
        security_deposit: 240000,
        key_money: 120000,
      },
      {
        property_id: property.id,
        room_number: '102',
        occupancy_status: 'vacant',
        monthly_rent: 0,
        tenant_name: null,
        lease_start_date: null,
        lease_end_date: null,
        security_deposit: 0,
        key_money: 0,
      },
    ];
    const { error: rentErr } = await admin.from('rent_rolls').insert(rentRollsPayload);
    if (rentErr) throw rentErr;

    const expensesPayload = [
      {
        property_id: property.id,
        expense_date: new Date().toISOString(),
        category: 'management_fee',
        amount: 25000,
        vendor: '管理会社A',
        description: '共用部管理費',
        is_recurring: true,
        recurring_frequency: 'monthly',
      },
      {
        property_id: property.id,
        expense_date: new Date().toISOString(),
        category: 'repair_cost',
        amount: 80000,
        vendor: '修繕会社B',
        description: '外壁補修',
        is_recurring: false,
      },
    ];
    const { error: expErr } = await admin.from('expenses').insert(expensesPayload);
    if (expErr) throw expErr;

    return NextResponse.json(
      {
        message: '開発用データ投入が完了しました',
        credentials: { email, password },
        hints: 'ログイン画面から上記のメール/パスワードでログインしてください',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Dev seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
