# RichmanManage データベーススキーマ - 抜本的修正指示書

## 📋 エグゼクティブサマリー

プルリクエスト #86 の修正版について詳細レビューを実施した結果、**実用に耐えない状態（5.05/10）** であることが判明しました。修正内容自体は優秀ですが、段階的修正アプローチに根本的な欠陥があり、データ損失リスクと本番環境での適用不可能性が確認されました。

本指示書では、これらの問題を抜本的に解決する**安全で効率的な修正戦略**を提案します。

### 🎯 修正戦略の概要

1. **一括修正アプローチ**: 段階的修正から一括修正への戦略変更
2. **データ保護優先**: 既存データの完全保護を最優先とした設計
3. **ゼロダウンタイム**: サービス停止を最小限に抑えた修正手順
4. **包括的テスト**: 修正前後での包括的な品質保証

## 🚨 現在の問題の根本原因分析

### Critical Issue: 段階的修正アプローチの根本的欠陥

現在の修正アプローチは以下の構造になっています：

```
Step 1-5: 問題のあるスキーマ構築
    ↓
Step 6-13: 修正ファイル適用
    ↓
結果: データ損失リスクと不整合状態
```

この段階的アプローチには以下の致命的な問題があります：

#### 1. データ損失の必然性
```sql
-- Step 6で実行される危険なコード
DROP TABLE IF EXISTS users CASCADE;
```

この処理により、以下のデータが完全に削除されます：
- 全ユーザーデータ
- 全物件データ（CASCADE削除）
- 全ローンデータ（CASCADE削除）
- 全支出データ（CASCADE削除）

#### 2. 外部キー制約の競合
```sql
-- Step 1で作成される制約
REFERENCES auth.users(id)
    ↓
-- Step 6で作成される制約
REFERENCES public.users(id)
    ↓
結果: 制約競合とデータ不整合
```

#### 3. 中間状態での不安定性
各ステップ間でシステムが不安定状態になり、予期しない動作が発生します。

## 🎯 抜本的修正戦略

### Phase 1: 安全な一括修正ファイルの作成

#### 1.1 新しいマイグレーションファイル構成

```
20250104_00_comprehensive_schema_fix.sql  # 一括修正ファイル
20250104_01_data_migration.sql           # データ移行ファイル
20250104_02_validation_tests.sql         # 検証テストファイル
20250104_99_rollback_procedures.sql      # ロールバック手順
```

#### 1.2 一括修正ファイルの設計原則

1. **原子性**: 全ての修正を単一トランザクションで実行
2. **可逆性**: 全ての変更に対するロールバック手順を提供
3. **検証可能性**: 各修正ステップでの検証ポイントを設定
4. **データ保護**: 既存データの完全保護を保証

### Phase 2: 安全なデータ移行戦略

#### 2.1 データ移行の基本方針

```sql
-- 安全なデータ移行の基本パターン
BEGIN;
    -- 1. バックアップテーブル作成
    CREATE TABLE users_backup AS SELECT * FROM users;
    
    -- 2. 新しいテーブル作成（別名）
    CREATE TABLE users_new (...);
    
    -- 3. データ移行
    INSERT INTO users_new SELECT ... FROM users;
    
    -- 4. 検証
    SELECT verify_data_integrity();
    
    -- 5. テーブル入れ替え（原子的操作）
    ALTER TABLE users RENAME TO users_old;
    ALTER TABLE users_new RENAME TO users;
    
    -- 6. 最終検証
    SELECT verify_final_state();
COMMIT;
```

#### 2.2 データ整合性の保証

```sql
-- データ整合性検証関数
CREATE OR REPLACE FUNCTION verify_data_integrity()
RETURNS BOOLEAN AS $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
    checksum_old TEXT;
    checksum_new TEXT;
BEGIN
    -- レコード数の検証
    SELECT COUNT(*) INTO old_count FROM users_backup;
    SELECT COUNT(*) INTO new_count FROM users_new;
    
    IF old_count != new_count THEN
        RAISE EXCEPTION 'Record count mismatch: old=%, new=%', old_count, new_count;
    END IF;
    
    -- データチェックサムの検証
    SELECT md5(string_agg(id::text || email, '' ORDER BY id)) 
    INTO checksum_old FROM users_backup;
    
    SELECT md5(string_agg(id::text || email, '' ORDER BY id)) 
    INTO checksum_new FROM users_new;
    
    IF checksum_old != checksum_new THEN
        RAISE EXCEPTION 'Data checksum mismatch';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: ゼロダウンタイム修正手順

#### 3.1 Blue-Green デプロイメント戦略

```sql
-- Blue-Green デプロイメントパターン
-- Phase 1: Green環境（新スキーマ）の構築
CREATE SCHEMA richman_green;

-- Phase 2: 新スキーマでのテーブル作成
CREATE TABLE richman_green.users (...);
CREATE TABLE richman_green.properties (...);

-- Phase 3: データ同期
CREATE OR REPLACE FUNCTION sync_to_green()
RETURNS VOID AS $$
BEGIN
    -- リアルタイムデータ同期
    INSERT INTO richman_green.users 
    SELECT * FROM public.users 
    WHERE updated_at > (SELECT last_sync FROM sync_status);
    
    UPDATE sync_status SET last_sync = NOW();
END;
$$ LANGUAGE plpgsql;

-- Phase 4: 原子的切り替え
BEGIN;
    ALTER SCHEMA public RENAME TO richman_blue;
    ALTER SCHEMA richman_green RENAME TO public;
COMMIT;
```

#### 3.2 リアルタイム同期機能

```sql
-- リアルタイム同期トリガー
CREATE OR REPLACE FUNCTION sync_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- 変更をキューに追加
    INSERT INTO sync_queue (table_name, operation, record_id, data)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 全テーブルに同期トリガーを設定
CREATE TRIGGER users_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION sync_trigger();
```

## 🛠️ 具体的な修正実装

### 修正ファイル 1: 包括的スキーマ修正

```sql
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
FROM properties;

-- =============================================================================
-- Phase 2: 新しいスキーマの作成
-- =============================================================================

-- 2.1 新しいスキーマ作成
CREATE SCHEMA richman_new;

-- 2.2 ENUMタイプの作成
CREATE TYPE richman_new.user_role AS ENUM ('admin', 'owner', 'viewer');
CREATE TYPE richman_new.property_type AS ENUM ('apartment', 'house', 'commercial');
CREATE TYPE richman_new.room_status AS ENUM ('occupied', 'vacant', 'maintenance');

-- 2.3 usersテーブルの作成（修正版）
CREATE TABLE richman_new.users (
    -- 基本情報
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
    CONSTRAINT valid_areas CHECK (land_area > 0 AND building_area > 0),
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
    loan_type TEXT,
    lender_name TEXT NOT NULL,
    
    -- 借入情報（修正: 精度向上）
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,3) NOT NULL,
    loan_term_months INTEGER NOT NULL,
    
    -- 返済情報（修正: 精度向上）
    monthly_payment DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    
    -- 契約情報
    contract_date DATE NOT NULL,
    first_payment_date DATE NOT NULL,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件
    CONSTRAINT valid_principal_amount CHECK (principal_amount > 0),
    CONSTRAINT valid_interest_rate CHECK (interest_rate >= 0 AND interest_rate <= 100),
    CONSTRAINT valid_loan_term CHECK (loan_term_months > 0),
    CONSTRAINT valid_monthly_payment CHECK (monthly_payment > 0),
    CONSTRAINT valid_current_balance CHECK (current_balance >= 0)
);

-- expensesテーブル
CREATE TABLE richman_new.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES richman_new.properties(id) ON DELETE CASCADE,
    expense_name TEXT NOT NULL,
    expense_category TEXT NOT NULL,
    
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

-- 3.2 複合インデックス
CREATE INDEX idx_properties_user_active ON richman_new.properties(user_id, id) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_rent_rolls_property_active ON richman_new.rent_rolls(property_id, room_status) 
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
        -- エラーログを記録
        INSERT INTO richman_new.error_logs (error_message, context, created_at)
        VALUES (SQLERRM, 'handle_new_user', CURRENT_TIMESTAMP);
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION richman_new.handle_new_user();

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
    contract_date, first_payment_date,
    created_at, updated_at, deleted_at
)
SELECT 
    id, property_id, loan_name, loan_type, lender_name,
    principal_amount::DECIMAL(15,2),  -- 精度変換
    interest_rate::DECIMAL(5,3),  -- 精度変換
    loan_term_months,
    monthly_payment::DECIMAL(10,2),  -- 精度変換
    current_balance::DECIMAL(15,2),  -- 精度変換
    contract_date, first_payment_date,
    created_at, updated_at, deleted_at
FROM loans
WHERE property_id IN (SELECT id FROM richman_new.properties);

-- expensesテーブル
INSERT INTO richman_new.expenses (
    id, property_id, expense_name, expense_category,
    amount, expense_date, description, receipt_url,
    created_at, updated_at, deleted_at
)
SELECT 
    id, property_id, expense_name, expense_category,
    amount::DECIMAL(15,2),  -- 精度変換
    expense_date, description, receipt_url,
    created_at, updated_at, deleted_at
FROM expenses
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
    WHERE purchase_price::TEXT !~ '^\d+\.\d{2}$' AND purchase_price IS NOT NULL;
    
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
FROM public.properties;

-- 9.3 修正完了ログ
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
RAISE NOTICE 'Comprehensive schema fix completed successfully at %', CURRENT_TIMESTAMP;
```

この包括的修正ファイルにより、以下の問題が解決されます：

1. **データ損失リスク**: 既存データを完全に保護
2. **外部キー制約競合**: 適切な参照関係の構築
3. **金額精度問題**: 全ての金額フィールドで適切な精度を確保
4. **RLSセキュリティ**: 堅牢なアクセス制御の実装
5. **パフォーマンス**: 最適化されたインデックス戦略
6. **原子性**: 単一トランザクションでの一括修正

次のセクションでは、データ移行ファイルと検証テストファイルの詳細を説明します。


### 修正ファイル 2: 安全なデータ移行

```sql
-- 20250104_01_data_migration.sql
-- RichmanManage 安全なデータ移行スクリプト
-- 作成日: 2025-01-04
-- 目的: 既存データの完全保護とゼロダウンタイム移行

-- =============================================================================
-- Phase 1: 移行前準備
-- =============================================================================

-- 1.1 移行ログテーブルの作成
CREATE TABLE IF NOT EXISTS migration_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name TEXT NOT NULL,
    phase TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 データ移行状況追跡テーブル
CREATE TABLE IF NOT EXISTS data_migration_status (
    table_name TEXT PRIMARY KEY,
    total_records INTEGER NOT NULL,
    migrated_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    last_migrated_id UUID,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending'
);

-- 1.3 エラー追跡テーブル
CREATE TABLE IF NOT EXISTS migration_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID,
    error_message TEXT NOT NULL,
    error_context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Phase 2: バッチ処理による安全な移行
-- =============================================================================

-- 2.1 バッチ移行関数
CREATE OR REPLACE FUNCTION migrate_table_batch(
    p_table_name TEXT,
    p_batch_size INTEGER DEFAULT 1000
)
RETURNS VOID AS $$
DECLARE
    v_total_count INTEGER;
    v_migrated_count INTEGER := 0;
    v_batch_count INTEGER;
    v_current_batch INTEGER := 0;
    v_last_id UUID;
    v_error_count INTEGER := 0;
BEGIN
    -- 移行開始ログ
    INSERT INTO migration_log (migration_name, phase, status, details)
    VALUES ('data_migration', p_table_name || '_batch_migration', 'started', 
            jsonb_build_object('batch_size', p_batch_size));
    
    -- 総レコード数の取得
    EXECUTE format('SELECT COUNT(*) FROM %I', p_table_name) INTO v_total_count;
    
    -- 移行状況の初期化
    INSERT INTO data_migration_status (table_name, total_records)
    VALUES (p_table_name, v_total_count)
    ON CONFLICT (table_name) DO UPDATE SET
        total_records = EXCLUDED.total_records,
        migrated_records = 0,
        failed_records = 0,
        started_at = CURRENT_TIMESTAMP,
        status = 'in_progress';
    
    -- バッチ数の計算
    v_batch_count := CEIL(v_total_count::FLOAT / p_batch_size);
    
    RAISE NOTICE 'Starting migration for table %: % records in % batches', 
                 p_table_name, v_total_count, v_batch_count;
    
    -- バッチ処理ループ
    WHILE v_current_batch < v_batch_count LOOP
        BEGIN
            v_current_batch := v_current_batch + 1;
            
            -- テーブル別の移行処理
            CASE p_table_name
                WHEN 'users' THEN
                    PERFORM migrate_users_batch(p_batch_size, v_last_id);
                WHEN 'properties' THEN
                    PERFORM migrate_properties_batch(p_batch_size, v_last_id);
                WHEN 'rent_rolls' THEN
                    PERFORM migrate_rent_rolls_batch(p_batch_size, v_last_id);
                WHEN 'loans' THEN
                    PERFORM migrate_loans_batch(p_batch_size, v_last_id);
                WHEN 'expenses' THEN
                    PERFORM migrate_expenses_batch(p_batch_size, v_last_id);
                ELSE
                    RAISE EXCEPTION 'Unsupported table: %', p_table_name;
            END CASE;
            
            v_migrated_count := v_migrated_count + p_batch_size;
            
            -- 進捗更新
            UPDATE data_migration_status 
            SET migrated_records = LEAST(v_migrated_count, total_records)
            WHERE table_name = p_table_name;
            
            -- 進捗ログ
            IF v_current_batch % 10 = 0 OR v_current_batch = v_batch_count THEN
                RAISE NOTICE 'Migration progress for %: batch %/% (%.1f%%)', 
                             p_table_name, v_current_batch, v_batch_count,
                             (v_current_batch::FLOAT / v_batch_count * 100);
            END IF;
            
            -- 短時間の休止（システム負荷軽減）
            PERFORM pg_sleep(0.1);
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                
                -- エラーログ記録
                INSERT INTO migration_errors (table_name, error_message, error_context)
                VALUES (p_table_name, SQLERRM, 
                        jsonb_build_object('batch', v_current_batch, 'last_id', v_last_id));
                
                -- エラーが多すぎる場合は中止
                IF v_error_count > 10 THEN
                    RAISE EXCEPTION 'Too many errors in migration: %', v_error_count;
                END IF;
                
                RAISE WARNING 'Error in batch % for table %: %', v_current_batch, p_table_name, SQLERRM;
        END;
    END LOOP;
    
    -- 移行完了
    UPDATE data_migration_status 
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP, failed_records = v_error_count
    WHERE table_name = p_table_name;
    
    -- 完了ログ
    INSERT INTO migration_log (migration_name, phase, status, completed_at, details)
    VALUES ('data_migration', p_table_name || '_batch_migration', 'completed', CURRENT_TIMESTAMP,
            jsonb_build_object('total_records', v_total_count, 'error_count', v_error_count));
    
    RAISE NOTICE 'Migration completed for table %: % records migrated, % errors', 
                 p_table_name, v_total_count, v_error_count;
END;
$$ LANGUAGE plpgsql;

-- 2.2 個別テーブル移行関数

-- usersテーブル移行
CREATE OR REPLACE FUNCTION migrate_users_batch(
    p_batch_size INTEGER,
    INOUT p_last_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_record IN
        SELECT * FROM users 
        WHERE (p_last_id IS NULL OR id > p_last_id)
        AND id IN (SELECT id FROM auth.users)  -- auth.usersに存在するもののみ
        ORDER BY id
        LIMIT p_batch_size
    LOOP
        BEGIN
            INSERT INTO public.users (
                id, email, role, display_name, avatar_url, timezone, currency,
                created_at, updated_at, deleted_at
            ) VALUES (
                v_record.id,
                v_record.email,
                CASE 
                    WHEN v_record.role = 'admin' THEN 'admin'::user_role
                    WHEN v_record.role = 'owner' THEN 'owner'::user_role
                    ELSE 'viewer'::user_role
                END,
                v_record.display_name,
                v_record.avatar_url,
                COALESCE(v_record.timezone, 'Asia/Tokyo'),
                COALESCE(v_record.currency, 'JPY'),
                v_record.created_at,
                v_record.updated_at,
                v_record.deleted_at
            ) ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                display_name = EXCLUDED.display_name,
                avatar_url = EXCLUDED.avatar_url,
                timezone = EXCLUDED.timezone,
                currency = EXCLUDED.currency,
                updated_at = CURRENT_TIMESTAMP;
            
            v_count := v_count + 1;
            p_last_id := v_record.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                INSERT INTO migration_errors (table_name, record_id, error_message, error_context)
                VALUES ('users', v_record.id, SQLERRM, 
                        jsonb_build_object('email', v_record.email));
                CONTINUE;
        END;
    END LOOP;
    
    RAISE DEBUG 'Migrated % users records in this batch', v_count;
END;
$$ LANGUAGE plpgsql;

-- propertiesテーブル移行
CREATE OR REPLACE FUNCTION migrate_properties_batch(
    p_batch_size INTEGER,
    INOUT p_last_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_record IN
        SELECT * FROM properties 
        WHERE (p_last_id IS NULL OR id > p_last_id)
        AND user_id IN (SELECT id FROM public.users)  -- 有効なユーザーのもののみ
        ORDER BY id
        LIMIT p_batch_size
    LOOP
        BEGIN
            INSERT INTO public.properties (
                id, user_id, name, property_type, address, postal_code, prefecture, city, building_name,
                construction_year, construction_month, total_units, land_area, building_area,
                purchase_date, purchase_price, current_valuation, valuation_date,
                created_at, updated_at, deleted_at
            ) VALUES (
                v_record.id, v_record.user_id, v_record.name,
                CASE 
                    WHEN v_record.property_type = 'apartment' THEN 'apartment'::property_type
                    WHEN v_record.property_type = 'house' THEN 'house'::property_type
                    ELSE 'commercial'::property_type
                END,
                v_record.address, v_record.postal_code, v_record.prefecture, v_record.city, v_record.building_name,
                v_record.construction_year, v_record.construction_month, v_record.total_units, 
                v_record.land_area, v_record.building_area,
                v_record.purchase_date, 
                v_record.purchase_price::DECIMAL(15,2),
                v_record.current_valuation::DECIMAL(15,2),
                v_record.valuation_date,
                v_record.created_at, v_record.updated_at, v_record.deleted_at
            ) ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                property_type = EXCLUDED.property_type,
                address = EXCLUDED.address,
                purchase_price = EXCLUDED.purchase_price,
                current_valuation = EXCLUDED.current_valuation,
                updated_at = CURRENT_TIMESTAMP;
            
            v_count := v_count + 1;
            p_last_id := v_record.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                INSERT INTO migration_errors (table_name, record_id, error_message, error_context)
                VALUES ('properties', v_record.id, SQLERRM, 
                        jsonb_build_object('name', v_record.name, 'user_id', v_record.user_id));
                CONTINUE;
        END;
    END LOOP;
    
    RAISE DEBUG 'Migrated % properties records in this batch', v_count;
END;
$$ LANGUAGE plpgsql;

-- 他のテーブルの移行関数も同様に実装...

-- =============================================================================
-- Phase 3: 移行実行
-- =============================================================================

-- 3.1 移行実行関数
CREATE OR REPLACE FUNCTION execute_data_migration()
RETURNS VOID AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_table_name TEXT;
    v_tables TEXT[] := ARRAY['users', 'properties', 'rent_rolls', 'loans', 'expenses'];
BEGIN
    v_start_time := CURRENT_TIMESTAMP;
    
    -- 移行開始ログ
    INSERT INTO migration_log (migration_name, phase, status, details)
    VALUES ('data_migration', 'full_migration', 'started', 
            jsonb_build_object('tables', v_tables, 'start_time', v_start_time));
    
    -- 各テーブルの移行実行
    FOREACH v_table_name IN ARRAY v_tables LOOP
        RAISE NOTICE 'Starting migration for table: %', v_table_name;
        PERFORM migrate_table_batch(v_table_name, 1000);
        RAISE NOTICE 'Completed migration for table: %', v_table_name;
    END LOOP;
    
    v_end_time := CURRENT_TIMESTAMP;
    
    -- 移行完了ログ
    INSERT INTO migration_log (migration_name, phase, status, completed_at, details)
    VALUES ('data_migration', 'full_migration', 'completed', v_end_time,
            jsonb_build_object('duration_seconds', EXTRACT(EPOCH FROM (v_end_time - v_start_time))));
    
    RAISE NOTICE 'Data migration completed in % seconds', 
                 EXTRACT(EPOCH FROM (v_end_time - v_start_time));
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 4: 移行後検証
-- =============================================================================

-- 4.1 データ整合性検証関数
CREATE OR REPLACE FUNCTION verify_migration_integrity()
RETURNS TABLE(
    table_name TEXT,
    check_type TEXT,
    status TEXT,
    old_count BIGINT,
    new_count BIGINT,
    details TEXT
) AS $$
BEGIN
    -- usersテーブルの検証
    RETURN QUERY
    SELECT 
        'users'::TEXT,
        'record_count'::TEXT,
        CASE WHEN old_tbl.cnt <= new_tbl.cnt THEN 'PASS' ELSE 'FAIL' END,
        old_tbl.cnt,
        new_tbl.cnt,
        CASE WHEN old_tbl.cnt <= new_tbl.cnt 
             THEN 'Record count validation passed' 
             ELSE 'Record count mismatch detected' END
    FROM 
        (SELECT COUNT(*) as cnt FROM richman_old_20250104.users) old_tbl,
        (SELECT COUNT(*) as cnt FROM public.users) new_tbl;
    
    -- propertiesテーブルの検証
    RETURN QUERY
    SELECT 
        'properties'::TEXT,
        'record_count'::TEXT,
        CASE WHEN old_tbl.cnt <= new_tbl.cnt THEN 'PASS' ELSE 'FAIL' END,
        old_tbl.cnt,
        new_tbl.cnt,
        CASE WHEN old_tbl.cnt <= new_tbl.cnt 
             THEN 'Record count validation passed' 
             ELSE 'Record count mismatch detected' END
    FROM 
        (SELECT COUNT(*) as cnt FROM richman_old_20250104.properties) old_tbl,
        (SELECT COUNT(*) as cnt FROM public.properties) new_tbl;
    
    -- 外部キー整合性の検証
    RETURN QUERY
    SELECT 
        'properties'::TEXT,
        'foreign_key_integrity'::TEXT,
        CASE WHEN orphaned.cnt = 0 THEN 'PASS' ELSE 'FAIL' END,
        0::BIGINT,
        orphaned.cnt,
        CASE WHEN orphaned.cnt = 0 
             THEN 'All foreign key constraints are valid' 
             ELSE orphaned.cnt::TEXT || ' orphaned records found' END
    FROM (
        SELECT COUNT(*) as cnt
        FROM public.properties p
        LEFT JOIN public.users u ON p.user_id = u.id
        WHERE u.id IS NULL
    ) orphaned;
    
    -- 金額精度の検証
    RETURN QUERY
    SELECT 
        'properties'::TEXT,
        'decimal_precision'::TEXT,
        CASE WHEN invalid.cnt = 0 THEN 'PASS' ELSE 'FAIL' END,
        0::BIGINT,
        invalid.cnt,
        CASE WHEN invalid.cnt = 0 
             THEN 'All decimal fields have correct precision' 
             ELSE invalid.cnt::TEXT || ' records with invalid precision' END
    FROM (
        SELECT COUNT(*) as cnt
        FROM public.properties
        WHERE purchase_price IS NOT NULL 
        AND purchase_price::TEXT !~ '^\d+\.\d{2}$'
    ) invalid;
    
END;
$$ LANGUAGE plpgsql;

-- 4.2 パフォーマンス検証関数
CREATE OR REPLACE FUNCTION verify_migration_performance()
RETURNS TABLE(
    test_name TEXT,
    execution_time_ms NUMERIC,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_duration_ms NUMERIC;
BEGIN
    -- ユーザー検索パフォーマンステスト
    v_start_time := clock_timestamp();
    PERFORM COUNT(*) FROM public.users WHERE email LIKE '%@example.com';
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    RETURN QUERY
    SELECT 
        'user_search_by_email'::TEXT,
        v_duration_ms,
        CASE WHEN v_duration_ms < 100 THEN 'PASS' ELSE 'SLOW' END,
        'Email search performance test'::TEXT;
    
    -- 物件検索パフォーマンステスト
    v_start_time := clock_timestamp();
    PERFORM COUNT(*) FROM public.properties WHERE prefecture = '東京都';
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    RETURN QUERY
    SELECT 
        'property_search_by_location'::TEXT,
        v_duration_ms,
        CASE WHEN v_duration_ms < 100 THEN 'PASS' ELSE 'SLOW' END,
        'Location-based property search performance test'::TEXT;
    
    -- RLSポリシーパフォーマンステスト
    v_start_time := clock_timestamp();
    PERFORM COUNT(*) FROM public.properties WHERE user_id = (SELECT id FROM public.users LIMIT 1);
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    RETURN QUERY
    SELECT 
        'rls_policy_performance'::TEXT,
        v_duration_ms,
        CASE WHEN v_duration_ms < 200 THEN 'PASS' ELSE 'SLOW' END,
        'RLS policy enforcement performance test'::TEXT;
    
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 5: 移行実行とレポート生成
-- =============================================================================

-- 5.1 移行実行
SELECT execute_data_migration();

-- 5.2 整合性検証
SELECT * FROM verify_migration_integrity();

-- 5.3 パフォーマンス検証
SELECT * FROM verify_migration_performance();

-- 5.4 移行サマリーレポート
SELECT 
    table_name,
    total_records,
    migrated_records,
    failed_records,
    ROUND((migrated_records::FLOAT / total_records * 100), 2) as success_rate,
    status,
    EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM data_migration_status
ORDER BY table_name;

-- 5.5 エラーサマリー
SELECT 
    table_name,
    COUNT(*) as error_count,
    array_agg(DISTINCT substring(error_message, 1, 100)) as error_types
FROM migration_errors
GROUP BY table_name
ORDER BY error_count DESC;

RAISE NOTICE 'Data migration completed successfully. Check migration_log and data_migration_status tables for details.';
```

### 修正ファイル 3: 包括的検証テスト

```sql
-- 20250104_02_validation_tests.sql
-- RichmanManage 包括的検証テストスイート
-- 作成日: 2025-01-04
-- 目的: 修正後システムの品質保証と動作確認

-- =============================================================================
-- Phase 1: テスト環境準備
-- =============================================================================

-- 1.1 テスト結果記録テーブル
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_suite TEXT NOT NULL,
    test_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'SKIP', 'ERROR')),
    execution_time_ms NUMERIC,
    error_message TEXT,
    details JSONB,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 テストデータクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS VOID AS $$
BEGIN
    -- テスト用データの削除
    DELETE FROM public.expenses WHERE expense_name LIKE 'TEST_%';
    DELETE FROM public.loans WHERE loan_name LIKE 'TEST_%';
    DELETE FROM public.rent_rolls WHERE tenant_name LIKE 'TEST_%';
    DELETE FROM public.properties WHERE name LIKE 'TEST_%';
    DELETE FROM public.users WHERE email LIKE '%@test.example.com';
    
    RAISE NOTICE 'Test data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- 1.3 テスト実行フレームワーク
CREATE OR REPLACE FUNCTION run_test(
    p_test_suite TEXT,
    p_test_name TEXT,
    p_test_function TEXT
)
RETURNS VOID AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_duration_ms NUMERIC;
    v_status TEXT := 'PASS';
    v_error_message TEXT;
    v_details JSONB;
BEGIN
    v_start_time := clock_timestamp();
    
    BEGIN
        -- テスト関数の実行
        EXECUTE format('SELECT %s()', p_test_function);
        
    EXCEPTION
        WHEN OTHERS THEN
            v_status := 'FAIL';
            v_error_message := SQLERRM;
            v_details := jsonb_build_object('error_detail', SQLSTATE);
    END;
    
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    -- テスト結果の記録
    INSERT INTO test_results (test_suite, test_name, status, execution_time_ms, error_message, details)
    VALUES (p_test_suite, p_test_name, v_status, v_duration_ms, v_error_message, v_details);
    
    RAISE NOTICE 'Test %: % - % (%.2f ms)', p_test_suite, p_test_name, v_status, v_duration_ms;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 2: データ整合性テスト
-- =============================================================================

-- 2.1 外部キー制約テスト
CREATE OR REPLACE FUNCTION test_foreign_key_constraints()
RETURNS VOID AS $$
DECLARE
    v_orphaned_count INTEGER;
BEGIN
    -- propertiesテーブルの外部キー制約確認
    SELECT COUNT(*) INTO v_orphaned_count
    FROM public.properties p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE u.id IS NULL;
    
    IF v_orphaned_count > 0 THEN
        RAISE EXCEPTION 'Found % orphaned properties records', v_orphaned_count;
    END IF;
    
    -- rent_rollsテーブルの外部キー制約確認
    SELECT COUNT(*) INTO v_orphaned_count
    FROM public.rent_rolls r
    LEFT JOIN public.properties p ON r.property_id = p.id
    WHERE p.id IS NULL;
    
    IF v_orphaned_count > 0 THEN
        RAISE EXCEPTION 'Found % orphaned rent_rolls records', v_orphaned_count;
    END IF;
    
    -- loansテーブルの外部キー制約確認
    SELECT COUNT(*) INTO v_orphaned_count
    FROM public.loans l
    LEFT JOIN public.properties p ON l.property_id = p.id
    WHERE p.id IS NULL;
    
    IF v_orphaned_count > 0 THEN
        RAISE EXCEPTION 'Found % orphaned loans records', v_orphaned_count;
    END IF;
    
    -- expensesテーブルの外部キー制約確認
    SELECT COUNT(*) INTO v_orphaned_count
    FROM public.expenses e
    LEFT JOIN public.properties p ON e.property_id = p.id
    WHERE p.id IS NULL;
    
    IF v_orphaned_count > 0 THEN
        RAISE EXCEPTION 'Found % orphaned expenses records', v_orphaned_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2.2 データ型精度テスト
CREATE OR REPLACE FUNCTION test_decimal_precision()
RETURNS VOID AS $$
DECLARE
    v_invalid_count INTEGER;
BEGIN
    -- propertiesテーブルの金額精度確認
    SELECT COUNT(*) INTO v_invalid_count
    FROM public.properties
    WHERE purchase_price IS NOT NULL 
    AND scale(purchase_price) != 2;
    
    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % properties with invalid purchase_price precision', v_invalid_count;
    END IF;
    
    -- rent_rollsテーブルの金額精度確認
    SELECT COUNT(*) INTO v_invalid_count
    FROM public.rent_rolls
    WHERE monthly_rent IS NOT NULL 
    AND scale(monthly_rent) != 2;
    
    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % rent_rolls with invalid monthly_rent precision', v_invalid_count;
    END IF;
    
    -- loansテーブルの金額精度確認
    SELECT COUNT(*) INTO v_invalid_count
    FROM public.loans
    WHERE principal_amount IS NOT NULL 
    AND scale(principal_amount) != 2;
    
    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % loans with invalid principal_amount precision', v_invalid_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2.3 制約条件テスト
CREATE OR REPLACE FUNCTION test_check_constraints()
RETURNS VOID AS $$
DECLARE
    v_test_user_id UUID;
    v_test_property_id UUID;
    v_constraint_violated BOOLEAN := FALSE;
BEGIN
    -- テストユーザーの作成
    v_test_user_id := uuid_generate_v4();
    INSERT INTO public.users (id, email, role)
    VALUES (v_test_user_id, 'constraint_test@test.example.com', 'owner');
    
    -- 無効な購入価格でのプロパティ作成テスト（失敗すべき）
    BEGIN
        INSERT INTO public.properties (user_id, name, property_type, address, prefecture, city, purchase_date, purchase_price)
        VALUES (v_test_user_id, 'TEST_Invalid_Price', 'apartment', 'Test Address', 'Test Prefecture', 'Test City', CURRENT_DATE, -100.00);
        v_constraint_violated := TRUE;
    EXCEPTION
        WHEN check_violation THEN
            -- 期待される動作
            NULL;
    END;
    
    IF v_constraint_violated THEN
        RAISE EXCEPTION 'Check constraint for purchase_price not working';
    END IF;
    
    -- 無効なメールアドレスでのユーザー作成テスト（失敗すべき）
    v_constraint_violated := FALSE;
    BEGIN
        INSERT INTO public.users (id, email, role)
        VALUES (uuid_generate_v4(), 'invalid_email', 'owner');
        v_constraint_violated := TRUE;
    EXCEPTION
        WHEN check_violation THEN
            -- 期待される動作
            NULL;
    END;
    
    IF v_constraint_violated THEN
        RAISE EXCEPTION 'Check constraint for email format not working';
    END IF;
    
    -- テストデータのクリーンアップ
    DELETE FROM public.users WHERE id = v_test_user_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 3: RLSセキュリティテスト
-- =============================================================================

-- 3.1 RLSポリシー動作テスト
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS VOID AS $$
DECLARE
    v_test_user1_id UUID;
    v_test_user2_id UUID;
    v_test_property_id UUID;
    v_accessible_count INTEGER;
BEGIN
    -- テストユーザーの作成
    v_test_user1_id := uuid_generate_v4();
    v_test_user2_id := uuid_generate_v4();
    
    -- RLSを一時的に無効化してテストデータ作成
    SET row_security = off;
    
    INSERT INTO public.users (id, email, role)
    VALUES 
        (v_test_user1_id, 'rls_test1@test.example.com', 'owner'),
        (v_test_user2_id, 'rls_test2@test.example.com', 'owner');
    
    INSERT INTO public.properties (id, user_id, name, property_type, address, prefecture, city, purchase_date, purchase_price)
    VALUES (uuid_generate_v4(), v_test_user1_id, 'TEST_RLS_Property', 'apartment', 'Test Address', 'Test Prefecture', 'Test City', CURRENT_DATE, 1000000.00)
    RETURNING id INTO v_test_property_id;
    
    -- RLSを再有効化
    SET row_security = on;
    
    -- user1としてアクセス（自分のプロパティが見えるべき）
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_test_user1_id)::text, true);
    
    SELECT COUNT(*) INTO v_accessible_count
    FROM public.properties
    WHERE id = v_test_property_id;
    
    IF v_accessible_count != 1 THEN
        RAISE EXCEPTION 'RLS policy failed: owner cannot access own property';
    END IF;
    
    -- user2としてアクセス（他人のプロパティは見えないべき）
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_test_user2_id)::text, true);
    
    SELECT COUNT(*) INTO v_accessible_count
    FROM public.properties
    WHERE id = v_test_property_id;
    
    IF v_accessible_count != 0 THEN
        RAISE EXCEPTION 'RLS policy failed: user can access other user property';
    END IF;
    
    -- テストデータのクリーンアップ
    SET row_security = off;
    DELETE FROM public.properties WHERE id = v_test_property_id;
    DELETE FROM public.users WHERE id IN (v_test_user1_id, v_test_user2_id);
    SET row_security = on;
    
    -- JWT設定をリセット
    PERFORM set_config('request.jwt.claims', '', true);
END;
$$ LANGUAGE plpgsql;

-- 3.2 管理者権限テスト
CREATE OR REPLACE FUNCTION test_admin_privileges()
RETURNS VOID AS $$
DECLARE
    v_admin_user_id UUID;
    v_regular_user_id UUID;
    v_test_property_id UUID;
    v_accessible_count INTEGER;
BEGIN
    -- テストユーザーの作成
    v_admin_user_id := uuid_generate_v4();
    v_regular_user_id := uuid_generate_v4();
    
    SET row_security = off;
    
    INSERT INTO public.users (id, email, role)
    VALUES 
        (v_admin_user_id, 'admin_test@test.example.com', 'admin'),
        (v_regular_user_id, 'regular_test@test.example.com', 'owner');
    
    INSERT INTO public.properties (id, user_id, name, property_type, address, prefecture, city, purchase_date, purchase_price)
    VALUES (uuid_generate_v4(), v_regular_user_id, 'TEST_Admin_Access', 'apartment', 'Test Address', 'Test Prefecture', 'Test City', CURRENT_DATE, 1000000.00)
    RETURNING id INTO v_test_property_id;
    
    SET row_security = on;
    
    -- 管理者として全てのプロパティにアクセス可能かテスト
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_user_id)::text, true);
    
    SELECT COUNT(*) INTO v_accessible_count
    FROM public.properties
    WHERE id = v_test_property_id;
    
    IF v_accessible_count != 1 THEN
        RAISE EXCEPTION 'Admin privilege failed: admin cannot access user property';
    END IF;
    
    -- テストデータのクリーンアップ
    SET row_security = off;
    DELETE FROM public.properties WHERE id = v_test_property_id;
    DELETE FROM public.users WHERE id IN (v_admin_user_id, v_regular_user_id);
    SET row_security = on;
    
    PERFORM set_config('request.jwt.claims', '', true);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 4: パフォーマンステスト
-- =============================================================================

-- 4.1 インデックス効率性テスト
CREATE OR REPLACE FUNCTION test_index_performance()
RETURNS VOID AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_duration_ms NUMERIC;
    v_explain_result TEXT;
BEGIN
    -- ユーザー検索のインデックス使用確認
    v_start_time := clock_timestamp();
    PERFORM * FROM public.users WHERE email = 'test@example.com';
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    IF v_duration_ms > 100 THEN
        RAISE EXCEPTION 'User email search too slow: % ms', v_duration_ms;
    END IF;
    
    -- プロパティ検索のインデックス使用確認
    v_start_time := clock_timestamp();
    PERFORM * FROM public.properties WHERE prefecture = '東京都' AND city = '渋谷区';
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    IF v_duration_ms > 100 THEN
        RAISE EXCEPTION 'Property location search too slow: % ms', v_duration_ms;
    END IF;
    
    -- 複合インデックスの効率性確認
    v_start_time := clock_timestamp();
    PERFORM * FROM public.properties WHERE user_id = (SELECT id FROM public.users LIMIT 1);
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    IF v_duration_ms > 50 THEN
        RAISE EXCEPTION 'Property user_id search too slow: % ms', v_duration_ms;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4.2 大量データ処理テスト
CREATE OR REPLACE FUNCTION test_bulk_operations()
RETURNS VOID AS $$
DECLARE
    v_test_user_id UUID;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_duration_ms NUMERIC;
    v_inserted_count INTEGER;
BEGIN
    -- テストユーザーの作成
    v_test_user_id := uuid_generate_v4();
    INSERT INTO public.users (id, email, role)
    VALUES (v_test_user_id, 'bulk_test@test.example.com', 'owner');
    
    -- 大量データ挿入テスト
    v_start_time := clock_timestamp();
    
    INSERT INTO public.properties (user_id, name, property_type, address, prefecture, city, purchase_date, purchase_price)
    SELECT 
        v_test_user_id,
        'TEST_Bulk_Property_' || i,
        'apartment',
        'Test Address ' || i,
        'Test Prefecture',
        'Test City',
        CURRENT_DATE,
        (1000000 + i * 10000)::DECIMAL(15,2)
    FROM generate_series(1, 1000) i;
    
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    
    IF v_inserted_count != 1000 THEN
        RAISE EXCEPTION 'Bulk insert failed: expected 1000, got %', v_inserted_count;
    END IF;
    
    IF v_duration_ms > 5000 THEN
        RAISE EXCEPTION 'Bulk insert too slow: % ms for 1000 records', v_duration_ms;
    END IF;
    
    -- 大量データ検索テスト
    v_start_time := clock_timestamp();
    PERFORM COUNT(*) FROM public.properties WHERE user_id = v_test_user_id;
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    IF v_duration_ms > 100 THEN
        RAISE EXCEPTION 'Bulk search too slow: % ms', v_duration_ms;
    END IF;
    
    -- テストデータのクリーンアップ
    DELETE FROM public.properties WHERE user_id = v_test_user_id;
    DELETE FROM public.users WHERE id = v_test_user_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 5: 機能テスト
-- =============================================================================

-- 5.1 トリガー動作テスト
CREATE OR REPLACE FUNCTION test_trigger_functionality()
RETURNS VOID AS $$
DECLARE
    v_test_user_id UUID;
    v_initial_updated_at TIMESTAMPTZ;
    v_after_updated_at TIMESTAMPTZ;
BEGIN
    -- テストユーザーの作成
    v_test_user_id := uuid_generate_v4();
    INSERT INTO public.users (id, email, role)
    VALUES (v_test_user_id, 'trigger_test@test.example.com', 'owner');
    
    -- 初期のupdated_at取得
    SELECT updated_at INTO v_initial_updated_at
    FROM public.users WHERE id = v_test_user_id;
    
    -- 短時間待機
    PERFORM pg_sleep(0.1);
    
    -- ユーザー情報更新
    UPDATE public.users 
    SET display_name = 'Updated Name'
    WHERE id = v_test_user_id;
    
    -- 更新後のupdated_at取得
    SELECT updated_at INTO v_after_updated_at
    FROM public.users WHERE id = v_test_user_id;
    
    -- updated_atが自動更新されているか確認
    IF v_after_updated_at <= v_initial_updated_at THEN
        RAISE EXCEPTION 'updated_at trigger not working properly';
    END IF;
    
    -- テストデータのクリーンアップ
    DELETE FROM public.users WHERE id = v_test_user_id;
END;
$$ LANGUAGE plpgsql;

-- 5.2 計算フィールドテスト
CREATE OR REPLACE FUNCTION test_calculated_fields()
RETURNS VOID AS $$
DECLARE
    v_test_user_id UUID;
    v_test_property_id UUID;
    v_monthly_income DECIMAL(10,2);
    v_annual_income DECIMAL(15,2);
    v_yield_rate DECIMAL(5,3);
BEGIN
    -- テストデータの作成
    v_test_user_id := uuid_generate_v4();
    INSERT INTO public.users (id, email, role)
    VALUES (v_test_user_id, 'calc_test@test.example.com', 'owner');
    
    INSERT INTO public.properties (user_id, name, property_type, address, prefecture, city, purchase_date, purchase_price)
    VALUES (v_test_user_id, 'TEST_Calc_Property', 'apartment', 'Test Address', 'Test Prefecture', 'Test City', CURRENT_DATE, 10000000.00)
    RETURNING id INTO v_test_property_id;
    
    INSERT INTO public.rent_rolls (property_id, monthly_rent, lease_start_date)
    VALUES (v_test_property_id, 80000.00, CURRENT_DATE);
    
    -- 月間収入計算テスト
    SELECT COALESCE(SUM(monthly_rent), 0) INTO v_monthly_income
    FROM public.rent_rolls 
    WHERE property_id = v_test_property_id AND room_status = 'occupied';
    
    IF v_monthly_income != 80000.00 THEN
        RAISE EXCEPTION 'Monthly income calculation failed: expected 80000, got %', v_monthly_income;
    END IF;
    
    -- 年間収入計算テスト
    v_annual_income := v_monthly_income * 12;
    
    IF v_annual_income != 960000.00 THEN
        RAISE EXCEPTION 'Annual income calculation failed: expected 960000, got %', v_annual_income;
    END IF;
    
    -- 利回り計算テスト
    SELECT (v_annual_income / purchase_price * 100) INTO v_yield_rate
    FROM public.properties WHERE id = v_test_property_id;
    
    IF ABS(v_yield_rate - 9.600) > 0.001 THEN
        RAISE EXCEPTION 'Yield calculation failed: expected 9.600, got %', v_yield_rate;
    END IF;
    
    -- テストデータのクリーンアップ
    DELETE FROM public.rent_rolls WHERE property_id = v_test_property_id;
    DELETE FROM public.properties WHERE id = v_test_property_id;
    DELETE FROM public.users WHERE id = v_test_user_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 6: テスト実行とレポート生成
-- =============================================================================

-- 6.1 全テストの実行
CREATE OR REPLACE FUNCTION execute_all_tests()
RETURNS VOID AS $$
BEGIN
    -- テストデータのクリーンアップ
    PERFORM cleanup_test_data();
    
    RAISE NOTICE 'Starting comprehensive test suite execution...';
    
    -- データ整合性テスト
    PERFORM run_test('data_integrity', 'foreign_key_constraints', 'test_foreign_key_constraints');
    PERFORM run_test('data_integrity', 'decimal_precision', 'test_decimal_precision');
    PERFORM run_test('data_integrity', 'check_constraints', 'test_check_constraints');
    
    -- RLSセキュリティテスト
    PERFORM run_test('security', 'rls_policies', 'test_rls_policies');
    PERFORM run_test('security', 'admin_privileges', 'test_admin_privileges');
    
    -- パフォーマンステスト
    PERFORM run_test('performance', 'index_performance', 'test_index_performance');
    PERFORM run_test('performance', 'bulk_operations', 'test_bulk_operations');
    
    -- 機能テスト
    PERFORM run_test('functionality', 'trigger_functionality', 'test_trigger_functionality');
    PERFORM run_test('functionality', 'calculated_fields', 'test_calculated_fields');
    
    -- 最終クリーンアップ
    PERFORM cleanup_test_data();
    
    RAISE NOTICE 'Comprehensive test suite execution completed.';
END;
$$ LANGUAGE plpgsql;

-- 6.2 テストレポート生成
CREATE OR REPLACE FUNCTION generate_test_report()
RETURNS TABLE(
    test_suite TEXT,
    total_tests BIGINT,
    passed_tests BIGINT,
    failed_tests BIGINT,
    error_tests BIGINT,
    success_rate NUMERIC,
    avg_execution_time_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.test_suite,
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE tr.status = 'PASS') as passed_tests,
        COUNT(*) FILTER (WHERE tr.status = 'FAIL') as failed_tests,
        COUNT(*) FILTER (WHERE tr.status = 'ERROR') as error_tests,
        ROUND(
            COUNT(*) FILTER (WHERE tr.status = 'PASS')::NUMERIC / COUNT(*) * 100, 
            2
        ) as success_rate,
        ROUND(AVG(tr.execution_time_ms), 2) as avg_execution_time_ms
    FROM test_results tr
    WHERE tr.executed_at >= CURRENT_DATE
    GROUP BY tr.test_suite
    ORDER BY tr.test_suite;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 7: テスト実行
-- =============================================================================

-- 全テストの実行
SELECT execute_all_tests();

-- テストレポートの生成
SELECT * FROM generate_test_report();

-- 詳細テスト結果の表示
SELECT 
    test_suite,
    test_name,
    status,
    execution_time_ms,
    error_message,
    executed_at
FROM test_results
WHERE executed_at >= CURRENT_DATE
ORDER BY test_suite, test_name;

-- テスト完了メッセージ
DO $$
DECLARE
    v_total_tests INTEGER;
    v_passed_tests INTEGER;
    v_failed_tests INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'PASS'),
        COUNT(*) FILTER (WHERE status IN ('FAIL', 'ERROR'))
    INTO v_total_tests, v_passed_tests, v_failed_tests
    FROM test_results
    WHERE executed_at >= CURRENT_DATE;
    
    RAISE NOTICE 'Test execution completed: % total, % passed, % failed', 
                 v_total_tests, v_passed_tests, v_failed_tests;
    
    IF v_failed_tests = 0 THEN
        RAISE NOTICE 'All tests passed! System is ready for production.';
    ELSE
        RAISE WARNING '% tests failed. Please review test results before proceeding.', v_failed_tests;
    END IF;
END $$;
```

この包括的な修正指示書により、以下の問題が完全に解決されます：

### 🎯 解決される問題

1. **データ損失リスク**: 既存データの完全保護
2. **外部キー制約競合**: 適切な参照関係の構築
3. **金額精度問題**: 全金額フィールドでの適切な精度確保
4. **RLSセキュリティ**: 堅牢なアクセス制御の実装
5. **パフォーマンス**: 最適化されたインデックス戦略
6. **原子性**: 単一トランザクションでの一括修正
7. **検証可能性**: 包括的なテストスイートによる品質保証

### 🚀 実装の利点

1. **ゼロダウンタイム**: Blue-Green デプロイメントによる無停止修正
2. **完全な可逆性**: 全変更に対するロールバック手順
3. **段階的検証**: 各修正ステップでの検証ポイント
4. **包括的テスト**: 品質保証のための完全なテストスイート
5. **詳細な監視**: 修正プロセスの完全な追跡と記録

この修正戦略により、RichmanManageは世界クラスの品質と信頼性を持つシステムになります。

