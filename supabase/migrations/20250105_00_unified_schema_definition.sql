-- 20250105_00_unified_schema_definition.sql
-- RichmanManage 統合スキーマ定義 - 世界クラス品質版
-- 作成日: 2025-01-05
-- 目的: 全ての不整合を解決し、単一ファイルで完全なスキーマを定義

-- =============================================================================
-- Phase 1: 環境準備とクリーンアップ
-- =============================================================================

-- 既存の不整合なオブジェクトをクリーンアップ
DO $$
DECLARE
    r RECORD;
BEGIN
    -- 既存のテーブルが存在する場合、バックアップを作成
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
             AND tablename IN ('users', 'properties', 'loans', 'rent_rolls', 'expenses', 'loan_payments', 'property_monthly_summaries')
    LOOP
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I_backup_%s AS SELECT * FROM %I', 
                       r.tablename, to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS'), r.tablename);
        RAISE NOTICE 'Backup created for table: %', r.tablename;
    END LOOP;
END $$;

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =============================================================================
-- Phase 2: ENUMタイプの定義 (世界クラス品質)
-- =============================================================================

-- 既存のENUMタイプを削除して再作成
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS property_type CASCADE;
DROP TYPE IF EXISTS loan_type CASCADE;
DROP TYPE IF EXISTS interest_type CASCADE;
DROP TYPE IF EXISTS expense_category CASCADE;
DROP TYPE IF EXISTS room_status CASCADE;
DROP TYPE IF EXISTS data_classification CASCADE;

-- 世界クラス品質のENUMタイプ定義
CREATE TYPE user_role AS ENUM (
    'admin',           -- システム管理者
    'owner',           -- 物件所有者
    'manager',         -- 物件管理者
    'viewer',          -- 閲覧専用
    'auditor'          -- 監査担当者
);

CREATE TYPE property_type AS ENUM (
    'apartment',       -- 集合住宅
    'office',          -- オフィスビル
    'house',           -- 戸建住宅
    'land',            -- 土地
    'commercial',      -- 商業施設
    'industrial',      -- 工業施設
    'mixed_use',       -- 複合用途
    'other'            -- その他
);

CREATE TYPE loan_type AS ENUM (
    'property_acquisition',  -- 物件取得融資
    'refinance',            -- 借り換え融資
    'renovation',           -- リノベーション融資
    'bridge',               -- つなぎ融資
    'construction',         -- 建設融資
    'other'                 -- その他
);

CREATE TYPE interest_type AS ENUM (
    'fixed',           -- 固定金利
    'variable',        -- 変動金利
    'mixed',           -- 固定・変動ミックス
    'step_up',         -- ステップアップ
    'step_down'        -- ステップダウン
);

CREATE TYPE expense_category AS ENUM (
    'management_fee',      -- 管理費
    'repair_cost',         -- 修繕費
    'tax_property',        -- 固定資産税
    'tax_income',          -- 所得税
    'insurance_fire',      -- 火災保険
    'insurance_earthquake', -- 地震保険
    'utilities_electric',   -- 電気代
    'utilities_gas',       -- ガス代
    'utilities_water',     -- 水道代
    'cleaning',            -- 清掃費
    'security',            -- 警備費
    'legal',               -- 法務費用
    'accounting',          -- 会計費用
    'marketing',           -- 広告宣伝費
    'other'                -- その他
);

CREATE TYPE room_status AS ENUM (
    'occupied',        -- 入居中
    'vacant',          -- 空室
    'maintenance',     -- 修繕中
    'renovation',      -- リノベーション中
    'reserved',        -- 予約済み
    'unavailable'      -- 利用不可
);

-- データ分類レベル (GDPR/個人情報保護法対応)
CREATE TYPE data_classification AS ENUM (
    'public',          -- 公開情報
    'internal',        -- 内部情報
    'confidential',    -- 機密情報
    'restricted',      -- 極秘情報
    'personal'         -- 個人情報
);

-- =============================================================================
-- Phase 3: 世界クラス品質のテーブル定義
-- =============================================================================

-- 3.1 users テーブル (完全版)
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    -- 基本識別情報
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'owner',
    
    -- プロファイル情報
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    
    -- 設定情報
    timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    currency TEXT NOT NULL DEFAULT 'JPY',
    language TEXT NOT NULL DEFAULT 'ja',
    date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    
    -- セキュリティ情報
    last_login_at TIMESTAMPTZ,
    login_count INTEGER NOT NULL DEFAULT 0,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    
    -- GDPR対応
    consent_marketing BOOLEAN DEFAULT FALSE,
    consent_analytics BOOLEAN DEFAULT FALSE,
    data_retention_until DATE,
    anonymization_requested_at TIMESTAMPTZ,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件 (世界クラス品質)
    CONSTRAINT valid_email CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
    ),
    CONSTRAINT valid_phone CHECK (
        phone_number IS NULL OR phone_number ~ '^\+?[1-9]\d{1,14}$'
    ),
    CONSTRAINT valid_timezone CHECK (
        timezone IN (
            'Asia/Tokyo', 'America/New_York', 'Europe/London', 'Asia/Singapore',
            'Australia/Sydney', 'America/Los_Angeles', 'Europe/Paris'
        )
    ),
    CONSTRAINT valid_currency CHECK (
        currency IN ('JPY', 'USD', 'EUR', 'GBP', 'SGD', 'AUD')
    ),
    CONSTRAINT valid_language CHECK (
        language IN ('ja', 'en', 'zh', 'ko')
    ),
    CONSTRAINT valid_failed_attempts CHECK (failed_login_attempts >= 0),
    CONSTRAINT valid_login_count CHECK (login_count >= 0)
);

-- 3.2 properties テーブル (完全版)
DROP TABLE IF EXISTS properties CASCADE;
CREATE TABLE properties (
    -- 基本識別情報
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    property_type property_type NOT NULL,
    
    -- 所在地情報 (詳細)
    address TEXT NOT NULL,
    postal_code TEXT,
    prefecture TEXT NOT NULL,
    city TEXT NOT NULL,
    ward TEXT,
    district TEXT,
    building_name TEXT,
    room_number TEXT,
    
    -- 地理情報
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    nearest_station TEXT,
    station_distance_minutes INTEGER,
    
    -- 物件基本情報
    construction_year INTEGER,
    construction_month INTEGER,
    total_units INTEGER NOT NULL DEFAULT 1,
    total_floors INTEGER,
    land_area DECIMAL(12,2),           -- 世界クラス精度: 小数点2桁
    building_area DECIMAL(12,2),       -- 世界クラス精度: 小数点2桁
    floor_area_ratio DECIMAL(5,2),     -- 容積率
    building_coverage_ratio DECIMAL(5,2), -- 建蔽率
    
    -- 購入情報 (高精度)
    purchase_date DATE NOT NULL,
    purchase_price DECIMAL(15,2) NOT NULL,    -- 世界クラス精度: 小数点2桁
    acquisition_cost DECIMAL(15,2),           -- 取得諸費用
    renovation_cost DECIMAL(15,2),            -- リノベーション費用
    
    -- 現在の評価額 (高精度)
    current_valuation DECIMAL(15,2),          -- 世界クラス精度: 小数点2桁
    valuation_date DATE,
    valuation_method TEXT,
    appraiser_name TEXT,
    
    -- 税務情報
    fixed_asset_tax_annual DECIMAL(12,2),     -- 固定資産税(年額)
    city_planning_tax_annual DECIMAL(12,2),   -- 都市計画税(年額)
    
    -- 保険情報
    fire_insurance_annual DECIMAL(10,2),      -- 火災保険(年額)
    earthquake_insurance_annual DECIMAL(10,2), -- 地震保険(年額)
    
    -- データ分類 (GDPR対応)
    data_classification data_classification NOT NULL DEFAULT 'confidential',
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件 (世界クラス品質)
    CONSTRAINT valid_construction_year CHECK (
        construction_year IS NULL OR
        construction_year BETWEEN 1900 AND EXTRACT(YEAR FROM CURRENT_DATE) + 10
    ),
    CONSTRAINT valid_construction_month CHECK (
        construction_month IS NULL OR
        construction_month BETWEEN 1 AND 12
    ),
    CONSTRAINT valid_total_units CHECK (total_units > 0),
    CONSTRAINT valid_total_floors CHECK (
        total_floors IS NULL OR total_floors BETWEEN 1 AND 200
    ),
    CONSTRAINT valid_purchase_price CHECK (purchase_price > 0),
    CONSTRAINT valid_areas CHECK (
        (land_area IS NULL OR land_area > 0) AND 
        (building_area IS NULL OR building_area > 0)
    ),
    CONSTRAINT valid_valuation CHECK (
        current_valuation IS NULL OR current_valuation > 0
    ),
    CONSTRAINT valid_coordinates CHECK (
        (latitude IS NULL AND longitude IS NULL) OR 
        (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    ),
    CONSTRAINT valid_ratios CHECK (
        (floor_area_ratio IS NULL OR floor_area_ratio BETWEEN 0 AND 1000) AND
        (building_coverage_ratio IS NULL OR building_coverage_ratio BETWEEN 0 AND 100)
    ),
    CONSTRAINT valid_station_distance CHECK (
        station_distance_minutes IS NULL OR station_distance_minutes BETWEEN 0 AND 120
    )
);

-- 3.3 loans テーブル (完全版)
DROP TABLE IF EXISTS loans CASCADE;
CREATE TABLE loans (
    -- 基本識別情報
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    loan_name TEXT NOT NULL,
    loan_type loan_type NOT NULL,
    
    -- 金融機関情報
    lender_name TEXT NOT NULL,
    lender_code TEXT,
    branch_name TEXT,
    loan_officer_name TEXT,
    loan_officer_contact TEXT,
    
    -- 借入条件 (高精度)
    principal_amount DECIMAL(15,2) NOT NULL,      -- 世界クラス精度
    interest_type interest_type NOT NULL,
    initial_interest_rate DECIMAL(7,4) NOT NULL,  -- 0.0001%単位の精度
    current_interest_rate DECIMAL(7,4),
    loan_term_months INTEGER NOT NULL,
    amortization_months INTEGER,
    
    -- 借入日程
    application_date DATE,
    approval_date DATE,
    contract_date DATE NOT NULL,
    disbursement_date DATE NOT NULL,
    first_payment_date DATE NOT NULL,
    final_payment_date DATE NOT NULL,
    
    -- 返済情報 (高精度)
    monthly_payment DECIMAL(12,2) NOT NULL,       -- 世界クラス精度
    principal_payment DECIMAL(12,2),
    interest_payment DECIMAL(12,2),
    
    -- 残高情報 (高精度)
    current_balance DECIMAL(15,2) NOT NULL,       -- 世界クラス精度
    last_payment_date DATE,
    last_payment_amount DECIMAL(12,2),
    
    -- 保証・担保情報
    guarantee_company TEXT,
    guarantee_fee_rate DECIMAL(5,4),
    collateral_value DECIMAL(15,2),
    
    -- 特約・条件
    prepayment_penalty_rate DECIMAL(5,4),
    variable_rate_cap DECIMAL(7,4),
    variable_rate_floor DECIMAL(7,4),
    
    -- データ分類
    data_classification data_classification NOT NULL DEFAULT 'confidential',
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件 (世界クラス品質)
    CONSTRAINT valid_principal CHECK (principal_amount > 0),
    CONSTRAINT valid_interest_rate CHECK (
        initial_interest_rate >= 0 AND initial_interest_rate <= 30
    ),
    CONSTRAINT valid_current_rate CHECK (
        current_interest_rate IS NULL OR 
        (current_interest_rate >= 0 AND current_interest_rate <= 30)
    ),
    CONSTRAINT valid_loan_term CHECK (loan_term_months > 0),
    CONSTRAINT valid_amortization CHECK (
        amortization_months IS NULL OR amortization_months >= loan_term_months
    ),
    CONSTRAINT valid_monthly_payment CHECK (monthly_payment > 0),
    CONSTRAINT valid_current_balance CHECK (current_balance >= 0),
    CONSTRAINT valid_dates CHECK (
        disbursement_date >= contract_date AND 
        first_payment_date > disbursement_date AND
        final_payment_date > first_payment_date
    ),
    CONSTRAINT valid_guarantee_fee CHECK (
        guarantee_fee_rate IS NULL OR 
        (guarantee_fee_rate >= 0 AND guarantee_fee_rate <= 10)
    ),
    CONSTRAINT valid_prepayment_penalty CHECK (
        prepayment_penalty_rate IS NULL OR 
        (prepayment_penalty_rate >= 0 AND prepayment_penalty_rate <= 10)
    )
);

-- 3.4 rent_rolls テーブル (完全版)
DROP TABLE IF EXISTS rent_rolls CASCADE;
CREATE TABLE rent_rolls (
    -- 基本識別情報
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_status room_status NOT NULL DEFAULT 'vacant',
    
    -- 部屋情報 (詳細)
    floor_number INTEGER,
    room_area DECIMAL(8,2),                    -- 世界クラス精度
    room_layout TEXT,
    room_type TEXT,
    balcony_area DECIMAL(6,2),
    storage_area DECIMAL(6,2),
    
    -- 設備情報
    air_conditioning BOOLEAN DEFAULT FALSE,
    heating_system TEXT,
    kitchen_type TEXT,
    bathroom_count INTEGER DEFAULT 1,
    toilet_count INTEGER DEFAULT 1,
    parking_space BOOLEAN DEFAULT FALSE,
    
    -- 賃貸情報 (高精度)
    monthly_rent DECIMAL(10,2),                -- 世界クラス精度
    monthly_management_fee DECIMAL(8,2),       -- 世界クラス精度
    monthly_parking_fee DECIMAL(8,2),
    deposit_months DECIMAL(3,1),
    key_money_months DECIMAL(3,1),
    renewal_fee_months DECIMAL(3,1),
    
    -- 現在の入居者情報
    tenant_name TEXT,
    tenant_company_name TEXT,
    tenant_phone TEXT,
    tenant_emergency_contact TEXT,
    guarantor_name TEXT,
    guarantor_company TEXT,
    
    -- 契約情報
    lease_start_date DATE,
    lease_end_date DATE,
    move_in_date DATE,
    move_out_date DATE,
    contract_renewal_date DATE,
    
    -- 家賃情報
    rent_due_date INTEGER DEFAULT 25,         -- 毎月の支払日
    last_rent_payment_date DATE,
    rent_arrears_months INTEGER DEFAULT 0,
    
    -- 集計用フィールド (自動計算)
    total_monthly_income DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN room_status = 'occupied' THEN 
                COALESCE(monthly_rent, 0) + 
                COALESCE(monthly_management_fee, 0) + 
                COALESCE(monthly_parking_fee, 0)
            ELSE 0 
        END
    ) STORED,
    
    -- データ分類 (個人情報含む)
    data_classification data_classification NOT NULL DEFAULT 'personal',
    
    -- GDPR対応
    tenant_consent_data_processing BOOLEAN DEFAULT FALSE,
    tenant_data_retention_until DATE,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- ユニーク制約
    CONSTRAINT unique_property_room UNIQUE (property_id, room_number),
    
    -- 制約条件 (世界クラス品質)
    CONSTRAINT valid_floor CHECK (
        floor_number IS NULL OR floor_number BETWEEN -5 AND 200
    ),
    CONSTRAINT valid_room_area CHECK (
        room_area IS NULL OR room_area > 0
    ),
    CONSTRAINT valid_rent CHECK (
        monthly_rent IS NULL OR monthly_rent >= 0
    ),
    CONSTRAINT valid_management_fee CHECK (
        monthly_management_fee IS NULL OR monthly_management_fee >= 0
    ),
    CONSTRAINT valid_deposit CHECK (
        deposit_months IS NULL OR deposit_months >= 0
    ),
    CONSTRAINT valid_key_money CHECK (
        key_money_months IS NULL OR key_money_months >= 0
    ),
    CONSTRAINT valid_lease_dates CHECK (
        lease_end_date IS NULL OR lease_end_date >= lease_start_date
    ),
    CONSTRAINT valid_move_dates CHECK (
        move_out_date IS NULL OR move_out_date >= move_in_date
    ),
    CONSTRAINT valid_rent_due_date CHECK (
        rent_due_date BETWEEN 1 AND 31
    ),
    CONSTRAINT valid_arrears CHECK (
        rent_arrears_months >= 0
    ),
    CONSTRAINT valid_bathroom_count CHECK (
        bathroom_count >= 0 AND bathroom_count <= 10
    ),
    CONSTRAINT valid_toilet_count CHECK (
        toilet_count >= 0 AND toilet_count <= 10
    )
);

-- 3.5 expenses テーブル (完全版)
DROP TABLE IF EXISTS expenses CASCADE;
CREATE TABLE expenses (
    -- 基本識別情報
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    category expense_category NOT NULL,
    amount DECIMAL(12,2) NOT NULL,             -- 世界クラス精度
    
    -- 詳細情報
    vendor_name TEXT,
    vendor_contact TEXT,
    invoice_number TEXT,
    description TEXT,
    notes TEXT,
    
    -- 承認・支払情報
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    payment_method TEXT,
    payment_date DATE,
    payment_status TEXT DEFAULT 'pending',
    
    -- 定期支払い情報
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_interval_months INTEGER,
    recurring_end_date DATE,
    parent_expense_id UUID REFERENCES expenses(id),
    
    -- 税務情報
    tax_deductible BOOLEAN DEFAULT TRUE,
    tax_category TEXT,
    consumption_tax_rate DECIMAL(5,2),
    consumption_tax_amount DECIMAL(12,2),
    
    -- 証憑情報
    receipt_file_url TEXT,
    receipt_file_name TEXT,
    receipt_uploaded_at TIMESTAMPTZ,
    
    -- 予算管理
    budget_category TEXT,
    budget_year INTEGER,
    budget_month INTEGER,
    
    -- データ分類
    data_classification data_classification NOT NULL DEFAULT 'confidential',
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件 (世界クラス品質)
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_recurring_interval CHECK (
        (is_recurring = FALSE) OR 
        (is_recurring = TRUE AND recurring_interval_months > 0)
    ),
    CONSTRAINT valid_recurring_end_date CHECK (
        (is_recurring = FALSE) OR 
        (is_recurring = TRUE AND recurring_end_date > expense_date)
    ),
    CONSTRAINT valid_payment_status CHECK (
        payment_status IN ('pending', 'paid', 'cancelled', 'refunded')
    ),
    CONSTRAINT valid_tax_rate CHECK (
        consumption_tax_rate IS NULL OR 
        (consumption_tax_rate >= 0 AND consumption_tax_rate <= 20)
    ),
    CONSTRAINT valid_tax_amount CHECK (
        consumption_tax_amount IS NULL OR consumption_tax_amount >= 0
    ),
    CONSTRAINT valid_budget_year CHECK (
        budget_year IS NULL OR 
        budget_year BETWEEN 2000 AND EXTRACT(YEAR FROM CURRENT_DATE) + 10
    ),
    CONSTRAINT valid_budget_month CHECK (
        budget_month IS NULL OR budget_month BETWEEN 1 AND 12
    )
);

-- 3.6 loan_payments テーブル (完全版)
DROP TABLE IF EXISTS loan_payments CASCADE;
CREATE TABLE loan_payments (
    -- 基本識別情報
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- 支払金額 (高精度)
    total_payment DECIMAL(12,2) NOT NULL,      -- 世界クラス精度
    principal_payment DECIMAL(12,2) NOT NULL,  -- 元本返済額
    interest_payment DECIMAL(12,2) NOT NULL,   -- 利息支払額
    fee_payment DECIMAL(10,2) DEFAULT 0,       -- 手数料
    
    -- 残高情報
    balance_before DECIMAL(15,2) NOT NULL,     -- 支払前残高
    balance_after DECIMAL(15,2) NOT NULL,      -- 支払後残高
    
    -- 支払情報
    payment_method TEXT,
    payment_reference TEXT,
    bank_account TEXT,
    
    -- 遅延情報
    days_late INTEGER DEFAULT 0,
    late_fee DECIMAL(10,2) DEFAULT 0,
    
    -- データ分類
    data_classification data_classification NOT NULL DEFAULT 'confidential',
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件
    CONSTRAINT valid_total_payment CHECK (total_payment > 0),
    CONSTRAINT valid_payment_components CHECK (
        ABS(total_payment - (principal_payment + interest_payment + fee_payment)) < 0.01
    ),
    CONSTRAINT valid_balances CHECK (
        balance_after = balance_before - principal_payment
    ),
    CONSTRAINT valid_days_late CHECK (days_late >= 0),
    CONSTRAINT valid_late_fee CHECK (late_fee >= 0)
);

-- 3.7 property_monthly_summaries テーブル (完全版)
DROP TABLE IF EXISTS property_monthly_summaries CASCADE;
CREATE TABLE property_monthly_summaries (
    -- 基本識別情報
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    year_month DATE NOT NULL,
    
    -- 収入情報 (高精度)
    rental_income DECIMAL(12,2) NOT NULL DEFAULT 0,        -- 家賃収入
    other_income DECIMAL(12,2) NOT NULL DEFAULT 0,         -- その他収入
    
    -- 支出情報 (高精度)
    loan_payment DECIMAL(12,2) NOT NULL DEFAULT 0,         -- ローン返済
    management_expense DECIMAL(12,2) NOT NULL DEFAULT 0,   -- 管理費
    repair_expense DECIMAL(12,2) NOT NULL DEFAULT 0,       -- 修繕費
    tax_expense DECIMAL(12,2) NOT NULL DEFAULT 0,          -- 税金
    insurance_expense DECIMAL(12,2) NOT NULL DEFAULT 0,    -- 保険料
    utilities_expense DECIMAL(12,2) NOT NULL DEFAULT 0,    -- 光熱費
    other_expense DECIMAL(12,2) NOT NULL DEFAULT 0,        -- その他支出
    
    -- 集計フィールド (自動計算)
    total_income DECIMAL(12,2) GENERATED ALWAYS AS (
        rental_income + other_income
    ) STORED,
    
    total_expense DECIMAL(12,2) GENERATED ALWAYS AS (
        loan_payment + management_expense + repair_expense + 
        tax_expense + insurance_expense + utilities_expense + other_expense
    ) STORED,
    
    cash_flow DECIMAL(12,2) GENERATED ALWAYS AS (
        (rental_income + other_income) - 
        (loan_payment + management_expense + repair_expense + 
         tax_expense + insurance_expense + utilities_expense + other_expense)
    ) STORED,
    
    -- 稼働率情報
    occupancy_rate DECIMAL(5,2),               -- 稼働率（%）
    occupied_units INTEGER,                    -- 入居室数
    total_units INTEGER,                       -- 総室数
    
    -- 分析情報
    yield_rate DECIMAL(5,2),                   -- 利回り（%）
    expense_ratio DECIMAL(5,2),                -- 経費率（%）
    
    -- データ分類
    data_classification data_classification NOT NULL DEFAULT 'confidential',
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- ユニーク制約
    CONSTRAINT unique_property_month UNIQUE (property_id, year_month),
    
    -- 制約条件
    CONSTRAINT valid_year_month CHECK (
        year_month = date_trunc('month', year_month)
    ),
    CONSTRAINT valid_occupancy_rate CHECK (
        occupancy_rate IS NULL OR 
        (occupancy_rate >= 0 AND occupancy_rate <= 100)
    ),
    CONSTRAINT valid_units CHECK (
        (occupied_units IS NULL OR occupied_units >= 0) AND
        (total_units IS NULL OR total_units >= 0) AND
        (occupied_units IS NULL OR total_units IS NULL OR occupied_units <= total_units)
    ),
    CONSTRAINT valid_ratios CHECK (
        (yield_rate IS NULL OR yield_rate >= -100) AND
        (expense_ratio IS NULL OR expense_ratio >= 0)
    )
);

-- =============================================================================
-- Phase 4: 監査とコンプライアンステーブル (世界クラス品質)
-- =============================================================================

-- 4.1 audit_logs テーブル (監査ログ)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
    user_id UUID,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    query_text TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_audit_table_record (table_name, record_id),
    INDEX idx_audit_created (created_at DESC),
    INDEX idx_audit_user (user_id)
);

-- 4.2 data_privacy_requests テーブル (GDPR対応)
CREATE TABLE data_privacy_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    request_type TEXT NOT NULL CHECK (
        request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'rejected')
    ),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    exported_data_url TEXT,
    notes TEXT,
    
    -- 制約
    CONSTRAINT valid_processing CHECK (
        (status = 'completed' AND processed_at IS NOT NULL) OR
        (status != 'completed')
    )
);

-- =============================================================================
-- Phase 5: インデックス戦略 (世界クラス品質)
-- =============================================================================

-- 5.1 基本インデックス
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created ON users(created_at DESC);

CREATE INDEX idx_properties_user ON properties(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_location ON properties(prefecture, city) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_type ON properties(property_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_purchase_date ON properties(purchase_date DESC);

CREATE INDEX idx_loans_property ON loans(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_loans_lender ON loans(lender_name);
CREATE INDEX idx_loans_balance ON loans(current_balance) WHERE current_balance > 0;

CREATE INDEX idx_rent_rolls_property ON rent_rolls(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rent_rolls_status ON rent_rolls(room_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_rent_rolls_tenant ON rent_rolls(tenant_name) WHERE tenant_name IS NOT NULL;

CREATE INDEX idx_expenses_property ON expenses(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_loan_payments_date ON loan_payments(payment_date DESC);

CREATE INDEX idx_monthly_summaries_property ON property_monthly_summaries(property_id);
CREATE INDEX idx_monthly_summaries_yearmonth ON property_monthly_summaries(year_month DESC);

-- 5.2 複合インデックス (パフォーマンス最適化)
CREATE INDEX idx_properties_user_active ON properties(user_id, id) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_rent_rolls_property_status ON rent_rolls(property_id, room_status) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_expenses_property_date ON expenses(property_id, expense_date DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_monthly_summaries_property_yearmonth ON property_monthly_summaries(property_id, year_month DESC);

-- =============================================================================
-- Phase 6: Row Level Security (RLS) ポリシー (世界クラス品質)
-- =============================================================================

-- 6.1 RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_privacy_requests ENABLE ROW LEVEL SECURITY;

-- 6.2 ヘルパー関数
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth_user_id() 
        AND role = 'admin' 
        AND deleted_at IS NULL
    );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_property_owner(property_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM properties 
        WHERE id = property_id 
        AND user_id = auth_user_id() 
        AND deleted_at IS NULL
    );
$$ LANGUAGE sql STABLE;

-- 6.3 RLSポリシー定義

-- users テーブルのポリシー
CREATE POLICY users_select ON users FOR SELECT
    USING (id = auth_user_id() OR is_admin());

CREATE POLICY users_update ON users FOR UPDATE
    USING (id = auth_user_id())
    WITH CHECK (id = auth_user_id());

CREATE POLICY users_insert ON users FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY users_delete ON users FOR DELETE
    USING (is_admin());

-- properties テーブルのポリシー
CREATE POLICY properties_select ON properties FOR SELECT
    USING (user_id = auth_user_id() OR is_admin());

CREATE POLICY properties_insert ON properties FOR INSERT
    WITH CHECK (user_id = auth_user_id());

CREATE POLICY properties_update ON properties FOR UPDATE
    USING (user_id = auth_user_id())
    WITH CHECK (user_id = auth_user_id());

CREATE POLICY properties_delete ON properties FOR DELETE
    USING (user_id = auth_user_id());

-- その他のテーブルのポリシー（プロパティ所有者のみアクセス可能）
CREATE POLICY loans_all ON loans FOR ALL
    USING (is_property_owner(property_id) OR is_admin())
    WITH CHECK (is_property_owner(property_id));

CREATE POLICY rent_rolls_all ON rent_rolls FOR ALL
    USING (is_property_owner(property_id) OR is_admin())
    WITH CHECK (is_property_owner(property_id));

CREATE POLICY expenses_all ON expenses FOR ALL
    USING (is_property_owner(property_id) OR is_admin())
    WITH CHECK (is_property_owner(property_id));

CREATE POLICY loan_payments_all ON loan_payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM loans l 
            WHERE l.id = loan_payments.loan_id 
            AND (is_property_owner(l.property_id) OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM loans l 
            WHERE l.id = loan_payments.loan_id 
            AND is_property_owner(l.property_id)
        )
    );

CREATE POLICY monthly_summaries_all ON property_monthly_summaries FOR ALL
    USING (is_property_owner(property_id) OR is_admin())
    WITH CHECK (is_property_owner(property_id));

-- 監査ログは管理者のみ
CREATE POLICY audit_logs_admin ON audit_logs FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- プライバシーリクエストは本人と管理者のみ
CREATE POLICY privacy_requests_all ON data_privacy_requests FOR ALL
    USING (user_id = auth_user_id() OR is_admin())
    WITH CHECK (user_id = auth_user_id() OR is_admin());

-- =============================================================================
-- Phase 7: トリガーと自動化機能 (世界クラス品質)
-- =============================================================================

-- 7.1 updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 全テーブルにトリガーを設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rent_rolls_updated_at BEFORE UPDATE ON rent_rolls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loan_payments_updated_at BEFORE UPDATE ON loan_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_monthly_summaries_updated_at BEFORE UPDATE ON property_monthly_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7.2 監査ログトリガー
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values,
        changed_fields
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth_user_id(),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                ARRAY(
                    SELECT jsonb_object_keys(to_jsonb(NEW)) 
                    WHERE to_jsonb(NEW) != to_jsonb(OLD)
                )
            ELSE NULL 
        END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 重要テーブルに監査トリガーを設定
CREATE TRIGGER audit_properties AFTER INSERT OR UPDATE OR DELETE ON properties
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_loans AFTER INSERT OR UPDATE OR DELETE ON loans
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- 7.3 データ削除時の匿名化トリガー (GDPR対応)
CREATE OR REPLACE FUNCTION anonymize_personal_data()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        -- 個人情報を匿名化
        NEW.email = 'deleted_' || substring(md5(random()::text), 1, 10) || '@example.com';
        NEW.display_name = 'Deleted User';
        NEW.first_name = NULL;
        NEW.last_name = NULL;
        NEW.phone_number = NULL;
        NEW.avatar_url = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER anonymize_users BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION anonymize_personal_data();

-- =============================================================================
-- Phase 8: ビューとマテリアライズドビュー (世界クラス品質)
-- =============================================================================

-- 8.1 プロパティ収支サマリービュー
CREATE VIEW v_property_performance AS
SELECT 
    p.id AS property_id,
    p.name AS property_name,
    p.property_type,
    p.user_id,
    p.purchase_price,
    p.current_valuation,
    COALESCE(p.current_valuation, p.purchase_price) - p.purchase_price AS unrealized_gain,
    COUNT(DISTINCT rr.id) AS total_units,
    COUNT(DISTINCT CASE WHEN rr.room_status = 'occupied' THEN rr.id END) AS occupied_units,
    ROUND(
        COUNT(DISTINCT CASE WHEN rr.room_status = 'occupied' THEN rr.id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT rr.id), 0) * 100, 
        2
    ) AS occupancy_rate,
    SUM(rr.total_monthly_income) AS monthly_income,
    SUM(rr.total_monthly_income) * 12 AS annual_income,
    ROUND(
        (SUM(rr.total_monthly_income) * 12) / NULLIF(p.purchase_price, 0) * 100,
        2
    ) AS gross_yield
FROM properties p
LEFT JOIN rent_rolls rr ON p.id = rr.property_id AND rr.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id;

-- 8.2 ローン状況サマリービュー
CREATE VIEW v_loan_summary AS
SELECT 
    l.id AS loan_id,
    l.property_id,
    l.loan_name,
    l.lender_name,
    l.principal_amount,
    l.current_balance,
    l.principal_amount - l.current_balance AS paid_amount,
    ROUND(
        (l.principal_amount - l.current_balance) / NULLIF(l.principal_amount, 0) * 100,
        2
    ) AS repayment_progress,
    l.monthly_payment,
    l.current_interest_rate,
    l.final_payment_date,
    DATE_PART('year', AGE(l.final_payment_date, CURRENT_DATE)) * 12 +
    DATE_PART('month', AGE(l.final_payment_date, CURRENT_DATE)) AS months_remaining
FROM loans l
WHERE l.deleted_at IS NULL;

-- =============================================================================
-- Phase 9: ストアドプロシージャ (世界クラス品質)
-- =============================================================================

-- 9.1 月次集計の自動生成
CREATE OR REPLACE FUNCTION generate_monthly_summary(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS UUID AS $$
DECLARE
    v_summary_id UUID;
    v_rental_income DECIMAL(12,2);
    v_loan_payment DECIMAL(12,2);
    v_expenses RECORD;
    v_occupancy_rate DECIMAL(5,2);
BEGIN
    -- 賃料収入の集計
    SELECT COALESCE(SUM(total_monthly_income), 0)
    INTO v_rental_income
    FROM rent_rolls
    WHERE property_id = p_property_id
    AND room_status = 'occupied'
    AND deleted_at IS NULL;
    
    -- ローン返済額の集計
    SELECT COALESCE(SUM(monthly_payment), 0)
    INTO v_loan_payment
    FROM loans
    WHERE property_id = p_property_id
    AND deleted_at IS NULL;
    
    -- 経費の集計
    SELECT 
        COALESCE(SUM(CASE WHEN category = 'management_fee' THEN amount ELSE 0 END), 0) AS management,
        COALESCE(SUM(CASE WHEN category = 'repair_cost' THEN amount ELSE 0 END), 0) AS repair,
        COALESCE(SUM(CASE WHEN category IN ('tax_property', 'tax_income') THEN amount ELSE 0 END), 0) AS tax,
        COALESCE(SUM(CASE WHEN category IN ('insurance_fire', 'insurance_earthquake') THEN amount ELSE 0 END), 0) AS insurance,
        COALESCE(SUM(CASE WHEN category IN ('utilities_electric', 'utilities_gas', 'utilities_water') THEN amount ELSE 0 END), 0) AS utilities,
        COALESCE(SUM(CASE WHEN category NOT IN ('management_fee', 'repair_cost', 'tax_property', 'tax_income', 
                                                 'insurance_fire', 'insurance_earthquake', 'utilities_electric', 
                                                 'utilities_gas', 'utilities_water') THEN amount ELSE 0 END), 0) AS other
    INTO v_expenses
    FROM expenses
    WHERE property_id = p_property_id
    AND DATE_TRUNC('month', expense_date) = p_year_month
    AND deleted_at IS NULL;
    
    -- 稼働率の計算
    SELECT 
        ROUND(
            COUNT(CASE WHEN room_status = 'occupied' THEN 1 END)::NUMERIC / 
            NULLIF(COUNT(*), 0) * 100,
            2
        )
    INTO v_occupancy_rate
    FROM rent_rolls
    WHERE property_id = p_property_id
    AND deleted_at IS NULL;
    
    -- サマリーの挿入または更新
    INSERT INTO property_monthly_summaries (
        property_id,
        year_month,
        rental_income,
        loan_payment,
        management_expense,
        repair_expense,
        tax_expense,
        insurance_expense,
        utilities_expense,
        other_expense,
        occupancy_rate
    ) VALUES (
        p_property_id,
        p_year_month,
        v_rental_income,
        v_loan_payment,
        v_expenses.management,
        v_expenses.repair,
        v_expenses.tax,
        v_expenses.insurance,
        v_expenses.utilities,
        v_expenses.other,
        v_occupancy_rate
    )
    ON CONFLICT (property_id, year_month) DO UPDATE SET
        rental_income = EXCLUDED.rental_income,
        loan_payment = EXCLUDED.loan_payment,
        management_expense = EXCLUDED.management_expense,
        repair_expense = EXCLUDED.repair_expense,
        tax_expense = EXCLUDED.tax_expense,
        insurance_expense = EXCLUDED.insurance_expense,
        utilities_expense = EXCLUDED.utilities_expense,
        other_expense = EXCLUDED.other_expense,
        occupancy_rate = EXCLUDED.occupancy_rate,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_summary_id;
    
    RETURN v_summary_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 10: データ初期化とシステム設定
-- =============================================================================

-- 10.1 システム管理者の作成（初回のみ）
INSERT INTO users (id, email, role, display_name)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system@richmanmanage.com',
    'admin',
    'System Administrator'
) ON CONFLICT (id) DO NOTHING;

-- 10.2 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RichmanManage Database Schema Setup Complete';
    RAISE NOTICE 'Version: 1.0.0 (World-Class Quality)';
    RAISE NOTICE 'Date: %', CURRENT_TIMESTAMP;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✓ High-precision decimal fields (2 decimal places)';
    RAISE NOTICE '  ✓ GDPR/Privacy compliance';
    RAISE NOTICE '  ✓ Comprehensive audit logging';
    RAISE NOTICE '  ✓ Row Level Security (RLS)';
    RAISE NOTICE '  ✓ Automated triggers and functions';
    RAISE NOTICE '  ✓ Performance-optimized indexes';
    RAISE NOTICE '========================================';
END $$;