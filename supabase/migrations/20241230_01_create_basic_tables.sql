-- ========================================
-- RichmanManage データベーススキーマ Phase 1
-- 基本テーブル作成
-- ========================================

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMタイプの作成
CREATE TYPE user_role AS ENUM ('admin', 'owner', 'viewer');
CREATE TYPE property_type AS ENUM ('apartment', 'office', 'house', 'land', 'other');
CREATE TYPE loan_type AS ENUM ('property_acquisition', 'refinance', 'renovation', 'other');
CREATE TYPE interest_type AS ENUM ('fixed', 'variable', 'mixed');
CREATE TYPE expense_category AS ENUM (
    'management_fee',    -- 管理費
    'repair_cost',       -- 修繕費
    'tax',              -- 税金
    'insurance',        -- 保険料
    'utilities',        -- 光熱費
    'cleaning',         -- 清掃費
    'other'             -- その他
);
CREATE TYPE room_status AS ENUM ('occupied', 'vacant', 'maintenance');

-- ========================================
-- 1. users テーブル
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- チェック制約
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- ========================================
-- 2. properties テーブル
-- ========================================
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    property_type property_type NOT NULL,
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
    
    -- 購入情報
    purchase_date DATE NOT NULL,
    purchase_price DECIMAL(15,0) NOT NULL,
    
    -- 現在の評価額
    current_valuation DECIMAL(15,0),
    valuation_date DATE,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- チェック制約
    CONSTRAINT valid_construction_year CHECK (construction_year BETWEEN 1900 AND EXTRACT(YEAR FROM CURRENT_DATE) + 10),
    CONSTRAINT valid_construction_month CHECK (construction_month BETWEEN 1 AND 12),
    CONSTRAINT valid_total_units CHECK (total_units > 0),
    CONSTRAINT valid_purchase_price CHECK (purchase_price > 0),
    CONSTRAINT valid_areas CHECK (land_area > 0 AND building_area > 0),
    CONSTRAINT valid_valuation CHECK (current_valuation IS NULL OR current_valuation > 0)
);

-- ========================================
-- 3. loans テーブル
-- ========================================
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    loan_name TEXT NOT NULL,
    loan_type loan_type NOT NULL,
    lender_name TEXT NOT NULL,
    
    -- 借入条件
    principal_amount DECIMAL(15,0) NOT NULL,
    interest_type interest_type NOT NULL,
    initial_interest_rate DECIMAL(5,3) NOT NULL,
    loan_term_months INTEGER NOT NULL,
    
    -- 借入日程
    contract_date DATE NOT NULL,
    disbursement_date DATE NOT NULL,
    first_payment_date DATE NOT NULL,
    final_payment_date DATE NOT NULL,
    
    -- 返済情報
    monthly_payment DECIMAL(15,0) NOT NULL,
    
    -- 残高情報
    current_balance DECIMAL(15,0) NOT NULL,
    last_payment_date DATE,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- チェック制約
    CONSTRAINT valid_principal CHECK (principal_amount > 0),
    CONSTRAINT valid_interest_rate CHECK (initial_interest_rate >= 0 AND initial_interest_rate <= 100),
    CONSTRAINT valid_loan_term CHECK (loan_term_months > 0),
    CONSTRAINT valid_monthly_payment CHECK (monthly_payment > 0),
    CONSTRAINT valid_current_balance CHECK (current_balance >= 0),
    CONSTRAINT valid_dates CHECK (disbursement_date >= contract_date AND first_payment_date > disbursement_date)
);

-- ========================================
-- 4. rent_rolls テーブル (レントロール)
-- ========================================
CREATE TABLE rent_rolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_status room_status NOT NULL DEFAULT 'vacant',
    
    -- 部屋情報
    floor_number INTEGER,
    room_area DECIMAL(8,2),
    room_layout TEXT,
    
    -- 賃貸情報
    monthly_rent DECIMAL(10,0),
    monthly_management_fee DECIMAL(10,0),
    deposit_months DECIMAL(3,1),
    key_money_months DECIMAL(3,1),
    
    -- 現在の入居者情報
    current_tenant_name TEXT,
    tenant_company_name TEXT,
    lease_start_date DATE,
    lease_end_date DATE,
    move_in_date DATE,
    
    -- 集計用フィールド（トリガーで自動更新）
    total_monthly_income DECIMAL(10,0) GENERATED ALWAYS AS (
        CASE 
            WHEN room_status = 'occupied' THEN COALESCE(monthly_rent, 0) + COALESCE(monthly_management_fee, 0)
            ELSE 0
        END
    ) STORED,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- ユニーク制約
    CONSTRAINT unique_property_room UNIQUE (property_id, room_number),
    
    -- チェック制約
    CONSTRAINT valid_floor CHECK (floor_number >= -5 AND floor_number <= 200),
    CONSTRAINT valid_room_area CHECK (room_area > 0),
    CONSTRAINT valid_rent CHECK (monthly_rent IS NULL OR monthly_rent >= 0),
    CONSTRAINT valid_management_fee CHECK (monthly_management_fee IS NULL OR monthly_management_fee >= 0),
    CONSTRAINT valid_deposit CHECK (deposit_months IS NULL OR deposit_months >= 0),
    CONSTRAINT valid_key_money CHECK (key_money_months IS NULL OR key_money_months >= 0),
    CONSTRAINT valid_lease_dates CHECK (lease_end_date IS NULL OR lease_end_date >= lease_start_date)
);

-- ========================================
-- 5. expenses テーブル
-- ========================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    category expense_category NOT NULL,
    amount DECIMAL(15,0) NOT NULL,
    
    -- 詳細情報
    vendor_name TEXT,
    description TEXT,
    
    -- 定期支払い情報
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_interval_months INTEGER,
    recurring_end_date DATE,
    
    -- 証憑情報
    receipt_file_url TEXT,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- チェック制約
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_recurring CHECK (
        (is_recurring = FALSE) OR 
        (is_recurring = TRUE AND recurring_interval_months > 0)
    ),
    CONSTRAINT valid_recurring_dates CHECK (
        (NOT is_recurring) OR 
        (recurring_end_date IS NULL OR recurring_end_date >= expense_date)
    )
);

-- ========================================
-- 6. loan_payments テーブル
-- ========================================
CREATE TABLE loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(15,0) NOT NULL,
    
    -- 内訳
    principal_amount DECIMAL(15,0) NOT NULL,
    interest_amount DECIMAL(15,0) NOT NULL,
    
    -- 支払い後の残高
    balance_after_payment DECIMAL(15,0) NOT NULL,
    
    -- 支払いステータス
    is_scheduled BOOLEAN DEFAULT TRUE,
    is_completed BOOLEAN DEFAULT FALSE,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- チェック制約
    CONSTRAINT valid_payment_amount CHECK (payment_amount > 0),
    CONSTRAINT valid_principal_amount CHECK (principal_amount >= 0),
    CONSTRAINT valid_interest_amount CHECK (interest_amount >= 0),
    CONSTRAINT valid_payment_breakdown CHECK (payment_amount = principal_amount + interest_amount),
    CONSTRAINT valid_balance CHECK (balance_after_payment >= 0)
);

-- ========================================
-- インデックスの作成
-- ========================================

-- users テーブル
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);

-- properties テーブル
CREATE INDEX idx_properties_user_id ON properties(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_prefecture_city ON properties(prefecture, city) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_purchase_date ON properties(purchase_date);
CREATE INDEX idx_properties_created_at ON properties(created_at);

-- loans テーブル
CREATE INDEX idx_loans_property_id ON loans(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_loans_lender_name ON loans(lender_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_loans_disbursement_date ON loans(disbursement_date);
CREATE INDEX idx_loans_current_balance ON loans(current_balance) WHERE deleted_at IS NULL;

-- rent_rolls テーブル
CREATE INDEX idx_rent_rolls_property_id ON rent_rolls(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rent_rolls_room_status ON rent_rolls(room_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_rent_rolls_lease_dates ON rent_rolls(lease_start_date, lease_end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_rent_rolls_monthly_income ON rent_rolls(total_monthly_income) WHERE deleted_at IS NULL;

-- expenses テーブル
CREATE INDEX idx_expenses_property_id ON expenses(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_category ON expenses(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_recurring ON expenses(is_recurring) WHERE deleted_at IS NULL AND is_recurring = TRUE;

-- loan_payments テーブル
CREATE INDEX idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX idx_loan_payments_payment_date ON loan_payments(payment_date);
CREATE INDEX idx_loan_payments_scheduled ON loan_payments(is_scheduled, is_completed);

-- ========================================
-- 更新日時自動更新用トリガー
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rent_rolls_updated_at BEFORE UPDATE ON rent_rolls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_payments_updated_at BEFORE UPDATE ON loan_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- コメントの追加
-- ========================================

-- テーブルコメント
COMMENT ON TABLE users IS 'システムユーザー情報';
COMMENT ON TABLE properties IS '物件基本情報';
COMMENT ON TABLE loans IS '借入情報';
COMMENT ON TABLE rent_rolls IS 'レントロール（部屋別賃貸情報）';
COMMENT ON TABLE expenses IS '支出管理';
COMMENT ON TABLE loan_payments IS '借入返済履歴';

-- 主要カラムコメント
COMMENT ON COLUMN properties.current_valuation IS '現在の評価額（定期的に更新）';
COMMENT ON COLUMN loans.current_balance IS '現在の借入残高';
COMMENT ON COLUMN rent_rolls.total_monthly_income IS '月額収入合計（家賃＋管理費）※入居中のみ';
COMMENT ON COLUMN expenses.is_recurring IS '定期支払いフラグ';
COMMENT ON COLUMN loan_payments.is_scheduled IS '予定された支払いかどうか';
COMMENT ON COLUMN loan_payments.is_completed IS '支払い完了フラグ';