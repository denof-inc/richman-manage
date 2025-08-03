-- ========================================
-- Phase 1 基本テーブル作成テスト
-- ========================================

-- テスト用データの投入と基本動作確認

BEGIN;

-- 1. テストユーザーの作成
INSERT INTO auth.users (id, email)
VALUES ('11111111-1111-1111-1111-111111111111', 'test@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, email, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'test@example.com', 'owner');

-- 2. テスト物件の作成
INSERT INTO properties (
    id,
    user_id,
    name,
    property_type,
    address,
    postal_code,
    prefecture,
    city,
    building_name,
    construction_year,
    construction_month,
    total_units,
    land_area,
    building_area,
    purchase_date,
    purchase_price,
    current_valuation,
    valuation_date
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'テストマンション',
    'apartment',
    '東京都港区南青山1-2-3',
    '107-0062',
    '東京都',
    '港区',
    '青山ビル',
    2020,
    3,
    10,
    300.50,
    450.75,
    '2023-01-15',
    150000000,
    160000000,
    '2024-01-01'
);

-- 3. テスト借入の作成
INSERT INTO loans (
    id,
    property_id,
    loan_name,
    loan_type,
    lender_name,
    principal_amount,
    interest_type,
    initial_interest_rate,
    loan_term_months,
    contract_date,
    disbursement_date,
    first_payment_date,
    final_payment_date,
    monthly_payment,
    current_balance
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'メインローン',
    'property_acquisition',
    '三菱UFJ銀行',
    120000000,
    'variable',
    1.250,
    420, -- 35年
    '2023-01-10',
    '2023-01-15',
    '2023-02-27',
    '2058-01-27',
    350000,
    119000000
);

-- 4. テストレントロールの作成
INSERT INTO rent_rolls (
    property_id,
    room_number,
    room_status,
    floor_number,
    room_area,
    room_layout,
    monthly_rent,
    monthly_management_fee,
    deposit_months,
    key_money_months,
    current_tenant_name,
    lease_start_date,
    lease_end_date,
    move_in_date
) VALUES 
(
    '22222222-2222-2222-2222-222222222222',
    '101',
    'occupied',
    1,
    45.50,
    '1LDK',
    120000,
    10000,
    2.0,
    1.0,
    '田中太郎',
    '2023-04-01',
    '2025-03-31',
    '2023-04-01'
),
(
    '22222222-2222-2222-2222-222222222222',
    '102',
    'vacant',
    1,
    35.25,
    '1K',
    95000,
    8000,
    2.0,
    0.0,
    NULL,
    NULL,
    NULL,
    NULL
);

-- 5. テスト支出の作成
INSERT INTO expenses (
    property_id,
    expense_date,
    category,
    amount,
    vendor_name,
    description,
    is_recurring,
    recurring_interval_months
) VALUES 
(
    '22222222-2222-2222-2222-222222222222',
    '2024-01-15',
    'management_fee',
    50000,
    '青山管理会社',
    '月次管理費',
    TRUE,
    1
),
(
    '22222222-2222-2222-2222-222222222222',
    '2024-01-20',
    'repair_cost',
    150000,
    '東京リフォーム',
    'エアコン交換工事',
    FALSE,
    NULL
);

-- 6. テスト返済履歴の作成
INSERT INTO loan_payments (
    loan_id,
    payment_date,
    payment_amount,
    principal_amount,
    interest_amount,
    balance_after_payment,
    is_scheduled,
    is_completed
) VALUES 
(
    '33333333-3333-3333-3333-333333333333',
    '2024-01-27',
    350000,
    225000,
    125000,
    118775000,
    TRUE,
    TRUE
),
(
    '33333333-3333-3333-3333-333333333333',
    '2024-02-27',
    350000,
    225500,
    124500,
    118549500,
    TRUE,
    FALSE
);

-- ========================================
-- 基本的な動作確認クエリ
-- ========================================

-- 物件の総収入計算
SELECT 
    p.name as property_name,
    COUNT(DISTINCT rr.id) as total_rooms,
    COUNT(DISTINCT CASE WHEN rr.room_status = 'occupied' THEN rr.id END) as occupied_rooms,
    SUM(rr.total_monthly_income) as monthly_income
FROM properties p
LEFT JOIN rent_rolls rr ON p.id = rr.property_id AND rr.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name;

-- 借入残高の確認
SELECT 
    l.loan_name,
    l.lender_name,
    l.principal_amount,
    l.current_balance,
    l.monthly_payment,
    l.principal_amount - l.current_balance as paid_amount
FROM loans l
WHERE l.deleted_at IS NULL;

-- 支出の月次集計
SELECT 
    DATE_TRUNC('month', e.expense_date) as month,
    e.category,
    SUM(e.amount) as total_amount,
    COUNT(*) as expense_count
FROM expenses e
WHERE e.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', e.expense_date), e.category
ORDER BY month, e.category;

-- 部屋の稼働率
SELECT 
    p.name as property_name,
    COUNT(*) as total_rooms,
    COUNT(CASE WHEN rr.room_status = 'occupied' THEN 1 END) as occupied_rooms,
    ROUND(COUNT(CASE WHEN rr.room_status = 'occupied' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as occupancy_rate
FROM properties p
JOIN rent_rolls rr ON p.id = rr.property_id
WHERE p.deleted_at IS NULL AND rr.deleted_at IS NULL
GROUP BY p.id, p.name;

-- トランザクションのロールバック（テストデータを残さない）
ROLLBACK;

-- ========================================
-- テーブル構造の確認
-- ========================================

-- テーブル一覧
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'properties', 'loans', 'rent_rolls', 'expenses', 'loan_payments')
ORDER BY tablename;

-- インデックス一覧
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'properties', 'loans', 'rent_rolls', 'expenses', 'loan_payments')
ORDER BY tablename, indexname;

-- 制約一覧
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('users', 'properties', 'loans', 'rent_rolls', 'expenses', 'loan_payments')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;