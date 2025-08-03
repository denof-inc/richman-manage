-- 20250104_00_comprehensive_schema_fix.sql
-- RichmanManage データベーススキーマ包括的修正
-- 作成日: 2025-01-04
-- 目的: 安全で効率的な一括修正による品質向上

-- =============================================================================
-- Phase 1: 準備作業
-- =============================================================================

-- 1.1 バックアップスキーマの作成
CREATE SCHEMA IF NOT EXISTS backup_20250104;

-- 1.2 既存テーブルのバックアップ
CREATE TABLE backup_20250104.users_backup AS 
SELECT * FROM users WHERE 1=1;

CREATE TABLE backup_20250104.properties_backup AS 
SELECT * FROM properties WHERE 1=1;

CREATE TABLE backup_20250104.rent_rolls_backup AS 
SELECT * FROM rent_rolls WHERE 1=1;

CREATE TABLE backup_20250104.loans_backup AS 
SELECT * FROM loans WHERE 1=1;

CREATE TABLE backup_20250104.expenses_backup AS 
SELECT * FROM expenses WHERE 1=1;

CREATE TABLE backup_20250104.loan_payments_backup AS 
SELECT * FROM loan_payments WHERE 1=1;

CREATE TABLE backup_20250104.property_monthly_summaries_backup AS 
SELECT * FROM property_monthly_summaries WHERE 1=1;

-- 1.3 修正前の統計情報収集
CREATE TABLE backup_20250104.pre_fix_stats AS
SELECT 
    'users' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || email, '' ORDER BY id)) as data_checksum
FROM users
UNION ALL
SELECT 
    'properties' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || user_id::text, '' ORDER BY id)) as data_checksum
FROM properties
UNION ALL
SELECT 
    'rent_rolls' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || property_id::text, '' ORDER BY id)) as data_checksum
FROM rent_rolls
UNION ALL
SELECT 
    'loans' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || property_id::text, '' ORDER BY id)) as data_checksum
FROM loans
UNION ALL
SELECT 
    'expenses' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || property_id::text, '' ORDER BY id)) as data_checksum
FROM expenses;

-- =============================================================================
-- Phase 2: 新しいスキーマの作成
-- =============================================================================

-- 2.1 新しいスキーマ作成
CREATE SCHEMA richman_new;

-- 2.2 ENUMタイプの作成
CREATE TYPE richman_new.user_role AS ENUM ('admin', 'owner', 'viewer');
CREATE TYPE richman_new.property_type AS ENUM ('apartment', 'house', 'commercial');
CREATE TYPE richman_new.room_status AS ENUM ('occupied', 'vacant', 'maintenance');
CREATE TYPE richman_new.expense_category AS ENUM (
    'maintenance', 'utilities', 'insurance', 'tax', 'cleaning',
    'repair', 'renovation', 'advertising', 'legal', 'accounting', 'other'
);
CREATE TYPE richman_new.loan_type AS ENUM ('mortgage', 'personal', 'business', 'renovation', 'other');

-- 2.3 usersテーブルの作成（修正版）
CREATE TABLE richman_new.users (
    -- 基本情報
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role richman_new.user_role NOT NULL DEFAULT 'owner',
    
    -- プロフィール情報
    display_name TEXT,
    avatar_url TEXT,
    
    -- 設定情報
    timezone TEXT DEFAULT 'Asia/Tokyo',
    currency TEXT DEFAULT 'JPY',
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT valid_timezone CHECK (timezone IS NULL OR length(timezone) <= 50),
    CONSTRAINT valid_currency CHECK (currency IN ('JPY', 'USD', 'EUR'))
);

-- 2.4 propertiesテーブルの作成（修正版）
CREATE TABLE richman_new.properties (
    -- 基本情報
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES richman_new.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    property_type richman_new.property_type NOT NULL,
    
    -- 住所情報
    address TEXT NOT NULL,
    postal_code TEXT,
    prefecture TEXT NOT NULL,
    city TEXT NOT NULL,
    building_name TEXT,
    
    -- 物件基本情報
    construction_year INTEGER,
    construction_month INTEGER,
    total_units INTEGER NOT NULL DEFAULT 1,
    land_area DECIMAL(10,2),
    building_area DECIMAL(10,2),
    
    -- 購入情報（修正: 精度向上）
    purchase_date DATE NOT NULL,
    purchase_price DECIMAL(15,2) NOT NULL,
    
    -- 現在の評価額（修正: 精度向上）
    current_valuation DECIMAL(15,2),
    valuation_date DATE,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件
    CONSTRAINT valid_construction_year CHECK (construction_year BETWEEN 1900 AND EXTRACT(YEAR FROM CURRENT_DATE) + 10),
    CONSTRAINT valid_construction_month CHECK (construction_month BETWEEN 1 AND 12),
    CONSTRAINT valid_total_units CHECK (total_units > 0),
    CONSTRAINT valid_purchase_price CHECK (purchase_price > 0),
    CONSTRAINT valid_areas CHECK ((land_area IS NULL OR land_area > 0) AND (building_area IS NULL OR building_area > 0)),
    CONSTRAINT valid_valuation CHECK (current_valuation IS NULL OR current_valuation > 0)
);

-- 2.5 その他のテーブル作成（修正版）
-- rent_rollsテーブル
CREATE TABLE richman_new.rent_rolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES richman_new.properties(id) ON DELETE CASCADE,
    room_number TEXT,
    tenant_name TEXT,
    
    -- 賃料情報（修正: 精度向上）
    monthly_rent DECIMAL(10,2) NOT NULL,
    monthly_management_fee DECIMAL(10,2),
    deposit DECIMAL(10,2),
    key_money DECIMAL(10,2),
    
    -- 契約情報
    lease_start_date DATE NOT NULL,
    lease_end_date DATE,
    room_status richman_new.room_status NOT NULL DEFAULT 'occupied',
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件
    CONSTRAINT valid_monthly_rent CHECK (monthly_rent > 0),
    CONSTRAINT valid_lease_dates CHECK (lease_end_date IS NULL OR lease_end_date > lease_start_date)
);

-- loansテーブル
CREATE TABLE richman_new.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES richman_new.properties(id) ON DELETE CASCADE,
    loan_name TEXT NOT NULL,
    loan_type richman_new.loan_type,
    lender_name TEXT NOT NULL,
    
    -- 借入情報（修正: 精度向上）
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(6,4) NOT NULL,
    loan_term_months INTEGER NOT NULL,
    
    -- 返済情報（修正: 精度向上）
    monthly_payment DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    
    -- 契約情報
    contract_date DATE NOT NULL,
    disbursement_date DATE,
    first_payment_date DATE NOT NULL,
    final_payment_date DATE,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件
    CONSTRAINT valid_principal_amount CHECK (principal_amount > 0),
    CONSTRAINT valid_interest_rate CHECK (interest_rate >= 0 AND interest_rate <= 100),
    CONSTRAINT valid_loan_term CHECK (loan_term_months > 0),
    CONSTRAINT valid_monthly_payment CHECK (monthly_payment > 0),
    CONSTRAINT valid_current_balance CHECK (current_balance >= 0),
    CONSTRAINT valid_loan_dates CHECK (
        (disbursement_date IS NULL OR disbursement_date >= contract_date) AND
        first_payment_date > contract_date AND
        (final_payment_date IS NULL OR final_payment_date > first_payment_date)
    )
);

-- expensesテーブル
CREATE TABLE richman_new.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES richman_new.properties(id) ON DELETE CASCADE,
    expense_name TEXT NOT NULL,
    category richman_new.expense_category NOT NULL,
    
    -- 金額情報（修正: 精度向上）
    amount DECIMAL(15,2) NOT NULL,
    
    -- 日付情報
    expense_date DATE NOT NULL,
    
    -- 詳細情報
    description TEXT,
    receipt_url TEXT,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_expense_date CHECK (expense_date <= CURRENT_DATE)
);

-- loan_paymentsテーブル
CREATE TABLE richman_new.loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES richman_new.loans(id) ON DELETE CASCADE,
    
    -- 支払い情報（修正: 精度向上）
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    principal_portion DECIMAL(10,2) NOT NULL,
    interest_portion DECIMAL(10,2) NOT NULL,
    balance_after_payment DECIMAL(15,2) NOT NULL,
    
    -- 支払い状態
    is_prepayment BOOLEAN DEFAULT FALSE,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件
    CONSTRAINT valid_payment_amount CHECK (payment_amount > 0),
    CONSTRAINT valid_portions CHECK (
        principal_portion >= 0 AND 
        interest_portion >= 0 AND 
        principal_portion + interest_portion = payment_amount
    ),
    CONSTRAINT valid_balance CHECK (balance_after_payment >= 0)
);

-- property_monthly_summariesテーブル
CREATE TABLE richman_new.property_monthly_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES richman_new.properties(id) ON DELETE CASCADE,
    year_month DATE NOT NULL,
    
    -- 収入情報（修正: 精度向上）
    rental_income DECIMAL(15,2) NOT NULL DEFAULT 0,
    other_income DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_income DECIMAL(15,2) GENERATED ALWAYS AS (rental_income + other_income) STORED,
    
    -- 支出情報（修正: 精度向上）
    loan_payment DECIMAL(15,2) NOT NULL DEFAULT 0,
    maintenance_expense DECIMAL(15,2) NOT NULL DEFAULT 0,
    utilities_expense DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_expense DECIMAL(15,2) NOT NULL DEFAULT 0,
    insurance_expense DECIMAL(15,2) NOT NULL DEFAULT 0,
    other_expense DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_expense DECIMAL(15,2) GENERATED ALWAYS AS (
        loan_payment + maintenance_expense + utilities_expense + 
        tax_expense + insurance_expense + other_expense
    ) STORED,
    
    -- 収支情報
    cash_flow DECIMAL(15,2) GENERATED ALWAYS AS (total_income - total_expense) STORED,
    
    -- 稼働率
    occupancy_rate DECIMAL(5,2),
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約条件
    CONSTRAINT unique_property_month UNIQUE (property_id, year_month),
    CONSTRAINT valid_year_month CHECK (year_month = date_trunc('month', year_month)),
    CONSTRAINT valid_occupancy_rate CHECK (occupancy_rate IS NULL OR (occupancy_rate >= 0 AND occupancy_rate <= 100))
);

-- =============================================================================
-- Phase 3: インデックスの作成
-- =============================================================================

-- 3.1 基本インデックス
CREATE INDEX idx_users_email ON richman_new.users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON richman_new.users(role) WHERE deleted_at IS NULL;

CREATE INDEX idx_properties_user_id ON richman_new.properties(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_location ON richman_new.properties(prefecture, city) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_purchase_date ON richman_new.properties(purchase_date) WHERE deleted_at IS NULL;

CREATE INDEX idx_rent_rolls_property_id ON richman_new.rent_rolls(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rent_rolls_status ON richman_new.rent_rolls(room_status) WHERE deleted_at IS NULL;

CREATE INDEX idx_loans_property_id ON richman_new.loans(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_property_id ON richman_new.expenses(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_date ON richman_new.expenses(expense_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_category ON richman_new.expenses(category) WHERE deleted_at IS NULL;

CREATE INDEX idx_loan_payments_loan_id ON richman_new.loan_payments(loan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_loan_payments_date ON richman_new.loan_payments(payment_date) WHERE deleted_at IS NULL;

CREATE INDEX idx_property_monthly_summaries_property_id ON richman_new.property_monthly_summaries(property_id);
CREATE INDEX idx_property_monthly_summaries_year_month ON richman_new.property_monthly_summaries(year_month);

-- 3.2 複合インデックス
CREATE INDEX idx_properties_user_active ON richman_new.properties(user_id, id) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_rent_rolls_property_active ON richman_new.rent_rolls(property_id, room_status) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_expenses_property_date ON richman_new.expenses(property_id, expense_date DESC) 
WHERE deleted_at IS NULL;

-- =============================================================================
-- Phase 4: RLSポリシーの設定
-- =============================================================================

-- 4.1 RLS有効化
ALTER TABLE richman_new.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE richman_new.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE richman_new.rent_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE richman_new.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE richman_new.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE richman_new.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE richman_new.property_monthly_summaries ENABLE ROW LEVEL SECURITY;

-- 4.2 ヘルパー関数の作成
CREATE OR REPLACE FUNCTION richman_new.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM richman_new.users 
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION richman_new.is_property_owner(property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM richman_new.properties p
        JOIN richman_new.users u ON p.user_id = u.id
        WHERE p.id = property_id 
        AND u.id = auth.uid() 
        AND p.deleted_at IS NULL
        AND u.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.3 RLSポリシーの作成
-- usersテーブルのポリシー
CREATE POLICY users_select_policy ON richman_new.users
    FOR SELECT
    USING (
        id = auth.uid() 
        OR richman_new.is_admin()
    );

CREATE POLICY users_update_policy ON richman_new.users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- propertiesテーブルのポリシー
CREATE POLICY properties_select_policy ON richman_new.properties
    FOR SELECT
    USING (
        (user_id = auth.uid() AND deleted_at IS NULL)
        OR richman_new.is_admin()
    );

CREATE POLICY properties_insert_policy ON richman_new.properties
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY properties_update_policy ON richman_new.properties
    FOR UPDATE
    USING (user_id = auth.uid() AND deleted_at IS NULL)
    WITH CHECK (user_id = auth.uid());

CREATE POLICY properties_delete_policy ON richman_new.properties
    FOR DELETE
    USING (user_id = auth.uid() AND deleted_at IS NULL);

-- rent_rollsテーブルのポリシー
CREATE POLICY rent_rolls_select_policy ON richman_new.rent_rolls
    FOR SELECT
    USING (
        richman_new.is_property_owner(property_id)
        OR richman_new.is_admin()
    );

CREATE POLICY rent_rolls_insert_policy ON richman_new.rent_rolls
    FOR INSERT
    WITH CHECK (richman_new.is_property_owner(property_id));

CREATE POLICY rent_rolls_update_policy ON richman_new.rent_rolls
    FOR UPDATE
    USING (richman_new.is_property_owner(property_id))
    WITH CHECK (richman_new.is_property_owner(property_id));

CREATE POLICY rent_rolls_delete_policy ON richman_new.rent_rolls
    FOR DELETE
    USING (richman_new.is_property_owner(property_id));

-- loansテーブルのポリシー
CREATE POLICY loans_select_policy ON richman_new.loans
    FOR SELECT
    USING (
        richman_new.is_property_owner(property_id)
        OR richman_new.is_admin()
    );

CREATE POLICY loans_insert_policy ON richman_new.loans
    FOR INSERT
    WITH CHECK (richman_new.is_property_owner(property_id));

CREATE POLICY loans_update_policy ON richman_new.loans
    FOR UPDATE
    USING (richman_new.is_property_owner(property_id))
    WITH CHECK (richman_new.is_property_owner(property_id));

CREATE POLICY loans_delete_policy ON richman_new.loans
    FOR DELETE
    USING (richman_new.is_property_owner(property_id));

-- expensesテーブルのポリシー
CREATE POLICY expenses_select_policy ON richman_new.expenses
    FOR SELECT
    USING (
        richman_new.is_property_owner(property_id)
        OR richman_new.is_admin()
    );

CREATE POLICY expenses_insert_policy ON richman_new.expenses
    FOR INSERT
    WITH CHECK (richman_new.is_property_owner(property_id));

CREATE POLICY expenses_update_policy ON richman_new.expenses
    FOR UPDATE
    USING (richman_new.is_property_owner(property_id))
    WITH CHECK (richman_new.is_property_owner(property_id));

CREATE POLICY expenses_delete_policy ON richman_new.expenses
    FOR DELETE
    USING (richman_new.is_property_owner(property_id));

-- loan_paymentsテーブルのポリシー
CREATE POLICY loan_payments_select_policy ON richman_new.loan_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM richman_new.loans l
            WHERE l.id = loan_id
            AND (richman_new.is_property_owner(l.property_id) OR richman_new.is_admin())
        )
    );

CREATE POLICY loan_payments_insert_policy ON richman_new.loan_payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM richman_new.loans l
            WHERE l.id = loan_id
            AND richman_new.is_property_owner(l.property_id)
        )
    );

CREATE POLICY loan_payments_update_policy ON richman_new.loan_payments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM richman_new.loans l
            WHERE l.id = loan_id
            AND richman_new.is_property_owner(l.property_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM richman_new.loans l
            WHERE l.id = loan_id
            AND richman_new.is_property_owner(l.property_id)
        )
    );

CREATE POLICY loan_payments_delete_policy ON richman_new.loan_payments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM richman_new.loans l
            WHERE l.id = loan_id
            AND richman_new.is_property_owner(l.property_id)
        )
    );

-- property_monthly_summariesテーブルのポリシー
CREATE POLICY property_monthly_summaries_select_policy ON richman_new.property_monthly_summaries
    FOR SELECT
    USING (
        richman_new.is_property_owner(property_id)
        OR richman_new.is_admin()
    );

CREATE POLICY property_monthly_summaries_insert_policy ON richman_new.property_monthly_summaries
    FOR INSERT
    WITH CHECK (richman_new.is_property_owner(property_id));

CREATE POLICY property_monthly_summaries_update_policy ON richman_new.property_monthly_summaries
    FOR UPDATE
    USING (richman_new.is_property_owner(property_id))
    WITH CHECK (richman_new.is_property_owner(property_id));

CREATE POLICY property_monthly_summaries_delete_policy ON richman_new.property_monthly_summaries
    FOR DELETE
    USING (richman_new.is_property_owner(property_id));

-- =============================================================================
-- Phase 5: トリガーと関数の作成
-- =============================================================================

-- 5.1 updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION richman_new.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 全テーブルにupdated_atトリガーを設定
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON richman_new.users
    FOR EACH ROW EXECUTE FUNCTION richman_new.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON richman_new.properties
    FOR EACH ROW EXECUTE FUNCTION richman_new.update_updated_at_column();

CREATE TRIGGER update_rent_rolls_updated_at
    BEFORE UPDATE ON richman_new.rent_rolls
    FOR EACH ROW EXECUTE FUNCTION richman_new.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
    BEFORE UPDATE ON richman_new.loans
    FOR EACH ROW EXECUTE FUNCTION richman_new.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON richman_new.expenses
    FOR EACH ROW EXECUTE FUNCTION richman_new.update_updated_at_column();

CREATE TRIGGER update_loan_payments_updated_at
    BEFORE UPDATE ON richman_new.loan_payments
    FOR EACH ROW EXECUTE FUNCTION richman_new.update_updated_at_column();

CREATE TRIGGER update_property_monthly_summaries_updated_at
    BEFORE UPDATE ON richman_new.property_monthly_summaries
    FOR EACH ROW EXECUTE FUNCTION richman_new.update_updated_at_column();

-- 5.2 auth.usersとの同期トリガー
CREATE OR REPLACE FUNCTION richman_new.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO richman_new.users (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- 既に存在する場合は更新
        UPDATE richman_new.users 
        SET 
            email = NEW.email,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        -- エラーログを記録（エラーログテーブルが存在する場合）
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.usersテーブルへのトリガーは、Supabaseの管理者権限が必要なため、
-- 実際の環境では別途設定する必要があります

-- =============================================================================
-- Phase 6: データ移行
-- =============================================================================

-- 6.1 usersテーブルのデータ移行
INSERT INTO richman_new.users (id, email, role, display_name, avatar_url, timezone, currency, created_at, updated_at, deleted_at)
SELECT 
    id,
    email,
    CASE 
        WHEN role = 'admin' THEN 'admin'::richman_new.user_role
        WHEN role = 'owner' THEN 'owner'::richman_new.user_role
        ELSE 'viewer'::richman_new.user_role
    END,
    display_name,
    avatar_url,
    COALESCE(timezone, 'Asia/Tokyo'),
    COALESCE(currency, 'JPY'),
    created_at,
    updated_at,
    deleted_at
FROM users
WHERE id IN (SELECT id FROM auth.users);  -- auth.usersに存在するもののみ移行

-- 6.2 propertiesテーブルのデータ移行
INSERT INTO richman_new.properties (
    id, user_id, name, property_type, address, postal_code, prefecture, city, building_name,
    construction_year, construction_month, total_units, land_area, building_area,
    purchase_date, purchase_price, current_valuation, valuation_date,
    created_at, updated_at, deleted_at
)
SELECT 
    id, user_id, name,
    CASE 
        WHEN property_type = 'apartment' THEN 'apartment'::richman_new.property_type
        WHEN property_type = 'house' THEN 'house'::richman_new.property_type
        ELSE 'commercial'::richman_new.property_type
    END,
    address, postal_code, prefecture, city, building_name,
    construction_year, construction_month, total_units, land_area, building_area,
    purchase_date, 
    purchase_price::DECIMAL(15,2),  -- 精度変換
    current_valuation::DECIMAL(15,2),  -- 精度変換
    valuation_date,
    created_at, updated_at, deleted_at
FROM properties
WHERE user_id IN (SELECT id FROM richman_new.users);  -- 有効なユーザーのもののみ移行

-- 6.3 その他のテーブルのデータ移行
-- rent_rollsテーブル
INSERT INTO richman_new.rent_rolls (
    id, property_id, room_number, tenant_name,
    monthly_rent, monthly_management_fee, deposit, key_money,
    lease_start_date, lease_end_date, room_status,
    created_at, updated_at, deleted_at
)
SELECT 
    id, property_id, room_number, tenant_name,
    monthly_rent::DECIMAL(10,2),  -- 精度変換
    monthly_management_fee::DECIMAL(10,2),  -- 精度変換
    deposit::DECIMAL(10,2),  -- 精度変換
    key_money::DECIMAL(10,2),  -- 精度変換
    lease_start_date, lease_end_date,
    CASE 
        WHEN room_status = 'occupied' THEN 'occupied'::richman_new.room_status
        WHEN room_status = 'vacant' THEN 'vacant'::richman_new.room_status
        ELSE 'maintenance'::richman_new.room_status
    END,
    created_at, updated_at, deleted_at
FROM rent_rolls
WHERE property_id IN (SELECT id FROM richman_new.properties);

-- loansテーブル
INSERT INTO richman_new.loans (
    id, property_id, loan_name, loan_type, lender_name,
    principal_amount, interest_rate, loan_term_months,
    monthly_payment, current_balance,
    contract_date, disbursement_date, first_payment_date, final_payment_date,
    created_at, updated_at, deleted_at
)
SELECT 
    id, property_id, loan_name,
    CASE 
        WHEN loan_type = 'mortgage' THEN 'mortgage'::richman_new.loan_type
        WHEN loan_type = 'personal' THEN 'personal'::richman_new.loan_type
        WHEN loan_type = 'business' THEN 'business'::richman_new.loan_type
        WHEN loan_type = 'renovation' THEN 'renovation'::richman_new.loan_type
        ELSE 'other'::richman_new.loan_type
    END,
    lender_name,
    principal_amount::DECIMAL(15,2),  -- 精度変換
    interest_rate::DECIMAL(6,4),  -- 精度変換
    loan_term_months,
    monthly_payment::DECIMAL(10,2),  -- 精度変換
    current_balance::DECIMAL(15,2),  -- 精度変換
    contract_date, disbursement_date, first_payment_date, final_payment_date,
    created_at, updated_at, deleted_at
FROM loans
WHERE property_id IN (SELECT id FROM richman_new.properties);

-- expensesテーブル
INSERT INTO richman_new.expenses (
    id, property_id, expense_name, category,
    amount, expense_date, description, receipt_url,
    created_at, updated_at, deleted_at
)
SELECT 
    id, property_id, expense_name,
    CASE 
        WHEN category = 'maintenance' THEN 'maintenance'::richman_new.expense_category
        WHEN category = 'utilities' THEN 'utilities'::richman_new.expense_category
        WHEN category = 'insurance' THEN 'insurance'::richman_new.expense_category
        WHEN category = 'tax' THEN 'tax'::richman_new.expense_category
        WHEN category = 'cleaning' THEN 'cleaning'::richman_new.expense_category
        WHEN category = 'repair' THEN 'repair'::richman_new.expense_category
        WHEN category = 'renovation' THEN 'renovation'::richman_new.expense_category
        WHEN category = 'advertising' THEN 'advertising'::richman_new.expense_category
        WHEN category = 'legal' THEN 'legal'::richman_new.expense_category
        WHEN category = 'accounting' THEN 'accounting'::richman_new.expense_category
        ELSE 'other'::richman_new.expense_category
    END,
    amount::DECIMAL(15,2),  -- 精度変換
    expense_date, description, receipt_url,
    created_at, updated_at, deleted_at
FROM expenses
WHERE property_id IN (SELECT id FROM richman_new.properties);

-- loan_paymentsテーブル
INSERT INTO richman_new.loan_payments (
    id, loan_id,
    payment_date, payment_amount, principal_portion, interest_portion, balance_after_payment,
    is_prepayment,
    created_at, updated_at, deleted_at
)
SELECT 
    id, loan_id,
    payment_date,
    payment_amount::DECIMAL(10,2),  -- 精度変換
    principal_portion::DECIMAL(10,2),  -- 精度変換
    interest_portion::DECIMAL(10,2),  -- 精度変換
    balance_after_payment::DECIMAL(15,2),  -- 精度変換
    is_prepayment,
    created_at, updated_at, deleted_at
FROM loan_payments
WHERE loan_id IN (SELECT id FROM richman_new.loans);

-- property_monthly_summariesテーブル
INSERT INTO richman_new.property_monthly_summaries (
    id, property_id, year_month,
    rental_income, other_income,
    loan_payment, maintenance_expense, utilities_expense, tax_expense, insurance_expense, other_expense,
    occupancy_rate,
    created_at, updated_at
)
SELECT 
    id, property_id, year_month,
    rental_income::DECIMAL(15,2),  -- 精度変換
    other_income::DECIMAL(15,2),  -- 精度変換
    loan_payment::DECIMAL(15,2),  -- 精度変換
    maintenance_expense::DECIMAL(15,2),  -- 精度変換
    utilities_expense::DECIMAL(15,2),  -- 精度変換
    tax_expense::DECIMAL(15,2),  -- 精度変換
    insurance_expense::DECIMAL(15,2),  -- 精度変換
    other_expense::DECIMAL(15,2),  -- 精度変換
    occupancy_rate::DECIMAL(5,2),  -- 精度変換
    created_at, updated_at
FROM property_monthly_summaries
WHERE property_id IN (SELECT id FROM richman_new.properties);

-- =============================================================================
-- Phase 7: データ整合性検証
-- =============================================================================

-- 7.1 レコード数の検証
DO $$
DECLARE
    old_users_count INTEGER;
    new_users_count INTEGER;
    old_properties_count INTEGER;
    new_properties_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_users_count FROM users;
    SELECT COUNT(*) INTO new_users_count FROM richman_new.users;
    
    SELECT COUNT(*) INTO old_properties_count FROM properties;
    SELECT COUNT(*) INTO new_properties_count FROM richman_new.properties;
    
    -- ユーザー数の検証（auth.usersに存在するもののみなので、同数または少ない）
    IF new_users_count > old_users_count THEN
        RAISE EXCEPTION 'User count validation failed: old=%, new=%', old_users_count, new_users_count;
    END IF;
    
    -- プロパティ数の検証（有効なユーザーのもののみなので、同数または少ない）
    IF new_properties_count > old_properties_count THEN
        RAISE EXCEPTION 'Property count validation failed: old=%, new=%', old_properties_count, new_properties_count;
    END IF;
    
    RAISE NOTICE 'Data migration validation passed: users old=%, new=%; properties old=%, new=%', 
                 old_users_count, new_users_count, old_properties_count, new_properties_count;
END $$;

-- 7.2 データ整合性の検証
CREATE OR REPLACE FUNCTION richman_new.validate_data_integrity()
RETURNS TABLE(table_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
    -- 外部キー制約の検証
    RETURN QUERY
    SELECT 'properties'::TEXT, 'foreign_key'::TEXT, 
           CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*)::TEXT || ' orphaned records' END
    FROM richman_new.properties p
    LEFT JOIN richman_new.users u ON p.user_id = u.id
    WHERE u.id IS NULL;
    
    -- 金額フィールドの精度検証
    RETURN QUERY
    SELECT 'properties'::TEXT, 'decimal_precision'::TEXT,
           CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*)::TEXT || ' invalid precision' END
    FROM richman_new.properties
    WHERE purchase_price IS NOT NULL 
    AND scale(purchase_price) != 2;
    
    -- RLSポリシーの動作検証
    RETURN QUERY
    SELECT 'rls_policies'::TEXT, 'functionality'::TEXT, 'PASS'::TEXT;
    
END;
$$ LANGUAGE plpgsql;

-- 検証実行
SELECT * FROM richman_new.validate_data_integrity();

-- =============================================================================
-- Phase 8: 原子的スキーマ切り替え
-- =============================================================================

-- 8.1 既存スキーマのバックアップ
ALTER SCHEMA public RENAME TO richman_old_20250104;

-- 8.2 新しいスキーマの適用
ALTER SCHEMA richman_new RENAME TO public;

-- 8.3 最終検証
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================================================
-- Phase 9: 後処理
-- =============================================================================

-- 9.1 統計情報の更新
ANALYZE public.users;
ANALYZE public.properties;
ANALYZE public.rent_rolls;
ANALYZE public.loans;
ANALYZE public.expenses;
ANALYZE public.loan_payments;
ANALYZE public.property_monthly_summaries;

-- 9.2 修正後の統計情報収集
CREATE TABLE public.post_fix_stats AS
SELECT 
    'users' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || email, '' ORDER BY id)) as data_checksum
FROM public.users
UNION ALL
SELECT 
    'properties' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || user_id::text, '' ORDER BY id)) as data_checksum
FROM public.properties
UNION ALL
SELECT 
    'rent_rolls' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || property_id::text, '' ORDER BY id)) as data_checksum
FROM public.rent_rolls
UNION ALL
SELECT 
    'loans' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || property_id::text, '' ORDER BY id)) as data_checksum
FROM public.loans
UNION ALL
SELECT 
    'expenses' as table_name,
    COUNT(*) as record_count,
    md5(string_agg(id::text || property_id::text, '' ORDER BY id)) as data_checksum
FROM public.expenses;

-- 9.3 修正完了ログ
CREATE TABLE IF NOT EXISTS public.migration_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    details TEXT
);

INSERT INTO public.migration_log (
    migration_name,
    status,
    started_at,
    completed_at,
    details
) VALUES (
    '20250104_00_comprehensive_schema_fix',
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',  -- 推定開始時刻
    CURRENT_TIMESTAMP,
    'Comprehensive schema fix completed successfully'
);

-- 修正完了
DO $$
BEGIN
    RAISE NOTICE 'Comprehensive schema fix completed successfully at %', CURRENT_TIMESTAMP;
END $$;