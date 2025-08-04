# RichmanManage データベーススキーマ修正指示書 - ベストプラクティス実装ガイド

## 📋 概要

本指示書は、プルリクエスト #86 で実装されたRichmanManageのデータベーススキーマを、実用レベルまで修正するための包括的なガイドです。企業レベルのセキュリティ、パフォーマンス、保守性を実現するベストプラクティスに基づいた修正手順を提供します。

## 🎯 修正目標

### セキュリティ目標
- Supabase Authとの適切な連携パターンの実装
- 堅牢なRow Level Security (RLS)の構築
- 権限昇格攻撃の防止
- データ整合性の保証

### パフォーマンス目標
- 高精度な金額計算の実現
- 効率的なインデックス戦略の実装
- 最適化されたトリガー処理
- スケーラブルなクエリ設計

### 保守性目標
- 包括的なエラーハンドリング
- テスト可能な設計
- 明確な依存関係
- 運用監視機能

## 🚨 Phase 1: Critical Issues修正（最優先）

### 1.1 外部キー参照の修正

#### 現在の問題
```sql
-- 問題のあるコード
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

#### 修正方針
Supabase Authとの適切な連携パターンを実装し、独自のusersテーブルとauth.usersテーブルを同期させる設計に変更します。

#### 修正手順

**Step 1: 新しいusersテーブル設計**
```sql
-- ファイル: supabase/migrations/20250803_01_fix_users_table.sql

-- 既存のusersテーブルを削除（データ移行が必要な場合は事前にバックアップ）
DROP TABLE IF EXISTS users CASCADE;

-- 新しいusersテーブル作成
CREATE TABLE users (
    -- auth.usersテーブルのidと同期
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- ユーザー基本情報
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'owner',
    
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

-- インデックス作成
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
```

**Step 2: auth.usersとの同期トリガー実装**
```sql
-- ユーザー作成時の同期関数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- 既に存在する場合は更新
        UPDATE public.users 
        SET 
            email = NEW.email,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        -- エラーログを記録（実装は後述）
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザー更新時の同期関数
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET 
        email = NEW.email,
        display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', display_name),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_user_update: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザー削除時の同期関数（論理削除）
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET 
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.id;
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_user_delete: %', SQLERRM;
        RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー設定
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();

CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_delete();
```

**Step 3: 既存テーブルの外部キー修正**
```sql
-- propertiesテーブルの外部キー修正
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_user_id_fkey;

ALTER TABLE properties 
ADD CONSTRAINT properties_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
```

### 1.2 金額データ型の修正

#### 現在の問題
```sql
-- 問題のあるコード
purchase_price DECIMAL(15,0) NOT NULL
monthly_rent DECIMAL(10,0)
```

#### 修正方針
不動産投資の精密な計算に対応するため、適切な精度を持つDECIMAL型に変更します。

#### 修正手順

**Step 1: 金額フィールドの精度修正**
```sql
-- ファイル: supabase/migrations/20250803_02_fix_decimal_precision.sql

-- propertiesテーブルの金額フィールド修正
ALTER TABLE properties 
ALTER COLUMN purchase_price TYPE DECIMAL(15,2);

ALTER TABLE properties 
ALTER COLUMN current_valuation TYPE DECIMAL(15,2);

-- rent_rollsテーブルの金額フィールド修正
ALTER TABLE rent_rolls 
ALTER COLUMN monthly_rent TYPE DECIMAL(10,2);

ALTER TABLE rent_rolls 
ALTER COLUMN monthly_management_fee TYPE DECIMAL(10,2);

-- expensesテーブルの金額フィールド修正
ALTER TABLE expenses 
ALTER COLUMN amount TYPE DECIMAL(15,2);

-- loansテーブルの金額フィールド修正
ALTER TABLE loans 
ALTER COLUMN principal_amount TYPE DECIMAL(15,2);

ALTER TABLE loans 
ALTER COLUMN monthly_payment TYPE DECIMAL(15,2);

ALTER TABLE loans 
ALTER COLUMN current_balance TYPE DECIMAL(15,2);

-- loan_paymentsテーブルの金額フィールド修正
ALTER TABLE loan_payments 
ALTER COLUMN payment_amount TYPE DECIMAL(15,2);

ALTER TABLE loan_payments 
ALTER COLUMN principal_amount TYPE DECIMAL(15,2);

ALTER TABLE loan_payments 
ALTER COLUMN interest_amount TYPE DECIMAL(15,2);

ALTER TABLE loan_payments 
ALTER COLUMN remaining_balance TYPE DECIMAL(15,2);

-- property_monthly_summariesテーブルの金額フィールド修正
ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_rent_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_management_fee_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_other_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN gross_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_management_fee TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_repair_cost TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_tax TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_insurance TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_utilities TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_cleaning TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_other TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_expenses TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN loan_principal_payment TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN loan_interest_payment TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_loan_payment TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN net_operating_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN cash_flow_before_tax TYPE DECIMAL(15,2);
```

**Step 2: 計算フィールドの修正**
```sql
-- rent_rollsテーブルの計算フィールド修正
ALTER TABLE rent_rolls 
DROP COLUMN total_monthly_income;

ALTER TABLE rent_rolls 
ADD COLUMN total_monthly_income DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE 
        WHEN room_status = 'occupied' THEN 
            COALESCE(monthly_rent, 0) + COALESCE(monthly_management_fee, 0)
        ELSE 0 
    END
) STORED;
```

### 1.3 RLSポリシーの完全再設計

#### 現在の問題
```sql
-- 問題のあるコード
CREATE OR REPLACE FUNCTION is_property_owner(property_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_value user_role;
BEGIN
    SELECT role INTO user_role_value
    FROM users
    WHERE id = auth.uid()
    AND deleted_at IS NULL;
    
    RETURN COALESCE(user_role_value, 'viewer'::user_role);
END;
```

#### 修正方針
適切な物件所有者確認とパフォーマンス最適化を実現するRLSポリシーを実装します。

#### 修正手順

**Step 1: ヘルパー関数の修正**
```sql
-- ファイル: supabase/migrations/20250803_03_fix_rls_policies.sql

-- 既存の問題のある関数を削除
DROP FUNCTION IF EXISTS is_property_owner(UUID);
DROP FUNCTION IF EXISTS get_user_role();

-- 適切な物件所有者確認関数
CREATE OR REPLACE FUNCTION is_property_owner(property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM properties p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = property_id 
        AND u.id = auth.uid() 
        AND p.deleted_at IS NULL
        AND u.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ユーザーロール取得関数（キャッシュ対応）
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
    user_role_value user_role;
BEGIN
    SELECT role INTO user_role_value
    FROM users
    WHERE id = auth.uid()
    AND deleted_at IS NULL;
    
    RETURN COALESCE(user_role_value, 'viewer'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 管理者権限確認関数
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ローン所有者確認関数
CREATE OR REPLACE FUNCTION is_loan_owner(loan_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM loans l
        JOIN properties p ON l.property_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE l.id = loan_id 
        AND u.id = auth.uid() 
        AND l.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND u.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**Step 2: usersテーブルのRLSポリシー修正**
```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;

-- 新しいポリシーを作成
-- 自分の情報のみ参照可能（管理者は全ユーザー参照可能）
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (
        id = auth.uid() 
        OR is_admin()
    );

-- 自分の情報のみ更新可能
CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND deleted_at IS NULL
    );

-- INSERTポリシーは不要（トリガーで自動作成）
-- 論理削除のみ許可
CREATE POLICY users_delete_policy ON users
    FOR UPDATE
    USING (
        id = auth.uid() 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        id = auth.uid() 
        AND deleted_at IS NOT NULL
    );
```

**Step 3: propertiesテーブルのRLSポリシー修正**
```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS properties_select_policy ON properties;
DROP POLICY IF EXISTS properties_update_policy ON properties;
DROP POLICY IF EXISTS properties_insert_policy ON properties;
DROP POLICY IF EXISTS properties_delete_policy ON properties;

-- 新しいポリシーを作成
-- 自分の物件のみ参照可能（管理者は全物件参照可能）
CREATE POLICY properties_select_policy ON properties
    FOR SELECT
    USING (
        (user_id = auth.uid() AND deleted_at IS NULL)
        OR is_admin()
    );

-- 自分の物件のみ更新可能
CREATE POLICY properties_update_policy ON properties
    FOR UPDATE
    USING (
        user_id = auth.uid() 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        user_id = auth.uid() 
        AND deleted_at IS NULL
    );

-- 自分の物件のみ作成可能
CREATE POLICY properties_insert_policy ON properties
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- 論理削除のみ許可
CREATE POLICY properties_delete_policy ON properties
    FOR UPDATE
    USING (
        user_id = auth.uid() 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        user_id = auth.uid() 
        AND deleted_at IS NOT NULL
    );
```

**Step 4: 関連テーブルのRLSポリシー修正**
```sql
-- loansテーブルのポリシー
DROP POLICY IF EXISTS loans_select_policy ON loans;
DROP POLICY IF EXISTS loans_update_policy ON loans;
DROP POLICY IF EXISTS loans_insert_policy ON loans;
DROP POLICY IF EXISTS loans_delete_policy ON loans;

CREATE POLICY loans_select_policy ON loans
    FOR SELECT
    USING (
        (is_property_owner(property_id) AND deleted_at IS NULL)
        OR is_admin()
    );

CREATE POLICY loans_update_policy ON loans
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    );

CREATE POLICY loans_insert_policy ON loans
    FOR INSERT
    WITH CHECK (
        is_property_owner(property_id)
    );

CREATE POLICY loans_delete_policy ON loans
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NOT NULL
    );

-- rent_rollsテーブルのポリシー
DROP POLICY IF EXISTS rent_rolls_select_policy ON rent_rolls;
DROP POLICY IF EXISTS rent_rolls_update_policy ON rent_rolls;
DROP POLICY IF EXISTS rent_rolls_insert_policy ON rent_rolls;
DROP POLICY IF EXISTS rent_rolls_delete_policy ON rent_rolls;

CREATE POLICY rent_rolls_select_policy ON rent_rolls
    FOR SELECT
    USING (
        (is_property_owner(property_id) AND deleted_at IS NULL)
        OR is_admin()
    );

CREATE POLICY rent_rolls_update_policy ON rent_rolls
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    );

CREATE POLICY rent_rolls_insert_policy ON rent_rolls
    FOR INSERT
    WITH CHECK (
        is_property_owner(property_id)
    );

CREATE POLICY rent_rolls_delete_policy ON rent_rolls
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NOT NULL
    );

-- expensesテーブルのポリシー
DROP POLICY IF EXISTS expenses_select_policy ON expenses;
DROP POLICY IF EXISTS expenses_update_policy ON expenses;
DROP POLICY IF EXISTS expenses_insert_policy ON expenses;
DROP POLICY IF EXISTS expenses_delete_policy ON expenses;

CREATE POLICY expenses_select_policy ON expenses
    FOR SELECT
    USING (
        (is_property_owner(property_id) AND deleted_at IS NULL)
        OR is_admin()
    );

CREATE POLICY expenses_update_policy ON expenses
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    );

CREATE POLICY expenses_insert_policy ON expenses
    FOR INSERT
    WITH CHECK (
        is_property_owner(property_id)
    );

CREATE POLICY expenses_delete_policy ON expenses
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NOT NULL
    );

-- loan_paymentsテーブルのポリシー
DROP POLICY IF EXISTS loan_payments_select_policy ON loan_payments;
DROP POLICY IF EXISTS loan_payments_update_policy ON loan_payments;
DROP POLICY IF EXISTS loan_payments_insert_policy ON loan_payments;
DROP POLICY IF EXISTS loan_payments_delete_policy ON loan_payments;

CREATE POLICY loan_payments_select_policy ON loan_payments
    FOR SELECT
    USING (
        is_loan_owner(loan_id)
        OR is_admin()
    );

CREATE POLICY loan_payments_update_policy ON loan_payments
    FOR UPDATE
    USING (
        is_loan_owner(loan_id)
    )
    WITH CHECK (
        is_loan_owner(loan_id)
    );

CREATE POLICY loan_payments_insert_policy ON loan_payments
    FOR INSERT
    WITH CHECK (
        is_loan_owner(loan_id)
    );

-- loan_paymentsは物理削除を許可
CREATE POLICY loan_payments_delete_policy ON loan_payments
    FOR DELETE
    USING (
        is_loan_owner(loan_id)
    );

-- property_monthly_summariesテーブルのポリシー
DROP POLICY IF EXISTS property_monthly_summaries_select_policy ON property_monthly_summaries;

CREATE POLICY property_monthly_summaries_select_policy ON property_monthly_summaries
    FOR SELECT
    USING (
        is_property_owner(property_id)
        OR is_admin()
    );

-- property_monthly_summariesは自動生成のため、INSERT/UPDATE/DELETEは制限
CREATE POLICY property_monthly_summaries_system_only ON property_monthly_summaries
    FOR ALL
    USING (false)
    WITH CHECK (false);
```


## ⚠️ Phase 2: High Priority Issues修正

### 2.1 トリガー処理の最適化

#### 現在の問題
```sql
-- 問題のあるコード
CREATE TRIGGER trigger_update_monthly_summary_rent_rolls
    AFTER INSERT OR UPDATE OR DELETE ON rent_rolls
    FOR EACH ROW EXECUTE FUNCTION update_monthly_summary();
```

#### 修正方針
バッチ処理対応とパフォーマンス最適化を実現するトリガー設計に変更します。

#### 修正手順

**Step 1: 最適化されたトリガー関数の実装**
```sql
-- ファイル: supabase/migrations/20250803_04_optimize_triggers.sql

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS trigger_update_monthly_summary_rent_rolls ON rent_rolls;
DROP TRIGGER IF EXISTS trigger_update_monthly_summary_expenses ON expenses;
DROP TRIGGER IF EXISTS trigger_update_monthly_summary_loan_payments ON loan_payments;
DROP FUNCTION IF EXISTS update_monthly_summary();

-- 月次集計更新キューテーブル
CREATE TABLE IF NOT EXISTS monthly_summary_update_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL,
    year_month DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    
    CONSTRAINT unique_property_month_queue UNIQUE (property_id, year_month)
);

-- インデックス作成
CREATE INDEX idx_monthly_summary_update_queue_unprocessed 
ON monthly_summary_update_queue(created_at) 
WHERE processed_at IS NULL;

-- 最適化されたトリガー関数（キューに追加のみ）
CREATE OR REPLACE FUNCTION queue_monthly_summary_update()
RETURNS TRIGGER AS $$
DECLARE
    target_month DATE;
    prop_id UUID;
BEGIN
    -- 対象月とプロパティIDを決定
    IF TG_TABLE_NAME = 'rent_rolls' THEN
        prop_id := COALESCE(NEW.property_id, OLD.property_id);
        target_month := DATE_TRUNC('month', CURRENT_DATE);
    ELSIF TG_TABLE_NAME = 'expenses' THEN
        prop_id := COALESCE(NEW.property_id, OLD.property_id);
        target_month := DATE_TRUNC('month', COALESCE(NEW.expense_date, OLD.expense_date));
    ELSIF TG_TABLE_NAME = 'loan_payments' THEN
        -- loan_paymentsの場合、property_idを取得
        SELECT l.property_id INTO prop_id
        FROM loans l
        WHERE l.id = COALESCE(NEW.loan_id, OLD.loan_id);
        target_month := DATE_TRUNC('month', COALESCE(NEW.payment_date, OLD.payment_date));
    END IF;
    
    -- キューに追加（重複は無視）
    INSERT INTO monthly_summary_update_queue (property_id, year_month)
    VALUES (prop_id, target_month)
    ON CONFLICT (property_id, year_month) DO NOTHING;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- エラーログを記録
        RAISE LOG 'Error in queue_monthly_summary_update: %, Table: %, Property: %, Month: %', 
                  SQLERRM, TG_TABLE_NAME, prop_id, target_month;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 新しいトリガー設定（軽量化）
CREATE TRIGGER trigger_queue_monthly_summary_rent_rolls
    AFTER INSERT OR UPDATE OR DELETE ON rent_rolls
    FOR EACH ROW EXECUTE FUNCTION queue_monthly_summary_update();

CREATE TRIGGER trigger_queue_monthly_summary_expenses
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION queue_monthly_summary_update();

CREATE TRIGGER trigger_queue_monthly_summary_loan_payments
    AFTER INSERT OR UPDATE OR DELETE ON loan_payments
    FOR EACH ROW EXECUTE FUNCTION queue_monthly_summary_update();
```

**Step 2: バッチ処理関数の実装**
```sql
-- 月次集計バッチ処理関数
CREATE OR REPLACE FUNCTION process_monthly_summary_queue(batch_size INTEGER DEFAULT 100)
RETURNS TABLE (
    processed_count INTEGER,
    error_count INTEGER,
    processing_time_ms BIGINT
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    processed INTEGER := 0;
    errors INTEGER := 0;
    queue_record RECORD;
BEGIN
    start_time := CURRENT_TIMESTAMP;
    
    -- 未処理のキューを取得（バッチサイズ分）
    FOR queue_record IN
        SELECT property_id, year_month, id
        FROM monthly_summary_update_queue
        WHERE processed_at IS NULL
        ORDER BY created_at
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            -- 月次集計を実行
            PERFORM refresh_monthly_summary(queue_record.property_id, queue_record.year_month);
            
            -- 処理完了をマーク
            UPDATE monthly_summary_update_queue
            SET processed_at = CURRENT_TIMESTAMP
            WHERE id = queue_record.id;
            
            processed := processed + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- エラーログを記録
                RAISE LOG 'Error processing monthly summary: Property %, Month %, Error: %', 
                          queue_record.property_id, queue_record.year_month, SQLERRM;
                errors := errors + 1;
        END;
    END LOOP;
    
    end_time := CURRENT_TIMESTAMP;
    
    RETURN QUERY SELECT 
        processed,
        errors,
        EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- 古いキューエントリのクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_monthly_summary_queue(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM monthly_summary_update_queue
    WHERE processed_at IS NOT NULL
    AND processed_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 インデックス戦略の実装

#### 修正手順

**Step 1: 基本インデックスの作成**
```sql
-- ファイル: supabase/migrations/20250803_05_create_indexes.sql

-- propertiesテーブルのインデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_user_id_active 
ON properties(user_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_user_prefecture_city 
ON properties(user_id, prefecture, city) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_purchase_date 
ON properties(purchase_date) 
WHERE deleted_at IS NULL;

-- rent_rollsテーブルのインデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_rolls_property_id_active 
ON rent_rolls(property_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_rolls_property_status 
ON rent_rolls(property_id, room_status) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_rolls_occupied_income 
ON rent_rolls(property_id, monthly_rent, monthly_management_fee) 
WHERE room_status = 'occupied' AND deleted_at IS NULL;

-- loansテーブルのインデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_property_id_active 
ON loans(property_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_active_balance 
ON loans(property_id, current_balance) 
WHERE current_balance > 0 AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_payment_dates 
ON loans(first_payment_date, final_payment_date) 
WHERE deleted_at IS NULL;

-- expensesテーブルのインデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_property_date 
ON expenses(property_id, expense_date) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_property_category_date 
ON expenses(property_id, category, expense_date) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_recurring 
ON expenses(property_id, category, recurring_interval_months) 
WHERE is_recurring = TRUE AND deleted_at IS NULL;

-- loan_paymentsテーブルのインデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_payments_loan_date 
ON loan_payments(loan_id, payment_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_payments_date_range 
ON loan_payments(payment_date, loan_id);

-- property_monthly_summariesテーブルのインデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_monthly_summaries_property_month 
ON property_monthly_summaries(property_id, year_month);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_monthly_summaries_year_month 
ON property_monthly_summaries(year_month);
```

**Step 2: 複合インデックスの最適化**
```sql
-- 検索パフォーマンス向上のための複合インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_search 
ON properties(user_id, property_type, prefecture, city) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_rolls_summary 
ON rent_rolls(property_id, room_status, monthly_rent) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_monthly_summary 
ON expenses(property_id, DATE_TRUNC('month', expense_date), category) 
WHERE deleted_at IS NULL;
```

### 2.3 エラーハンドリングの実装

#### 修正手順

**Step 1: エラーログテーブルの作成**
```sql
-- ファイル: supabase/migrations/20250803_06_error_handling.sql

-- エラーログテーブル
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_detail JSONB,
    function_name TEXT,
    user_id UUID REFERENCES users(id),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス用
    CONSTRAINT valid_error_type CHECK (error_type IN (
        'validation_error',
        'business_logic_error',
        'database_error',
        'security_error',
        'performance_error'
    ))
);

-- インデックス作成
CREATE INDEX idx_error_logs_type_date ON error_logs(error_type, occurred_at);
CREATE INDEX idx_error_logs_user_date ON error_logs(user_id, occurred_at);
CREATE INDEX idx_error_logs_function_date ON error_logs(function_name, occurred_at);
```

**Step 2: エラーハンドリング関数の実装**
```sql
-- エラーログ記録関数
CREATE OR REPLACE FUNCTION log_error(
    p_error_type TEXT,
    p_error_message TEXT,
    p_error_detail JSONB DEFAULT NULL,
    p_function_name TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO error_logs (
        error_type,
        error_message,
        error_detail,
        function_name,
        user_id
    ) VALUES (
        p_error_type,
        p_error_message,
        p_error_detail,
        p_function_name,
        COALESCE(p_user_id, auth.uid())
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
EXCEPTION
    WHEN OTHERS THEN
        -- エラーログの記録に失敗した場合はPostgreSQLログに出力
        RAISE LOG 'Failed to log error: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- データ検証関数
CREATE OR REPLACE FUNCTION validate_property_data(property_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    validation_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- 必須フィールドの検証
    IF NOT (property_data ? 'name') OR (property_data->>'name') = '' THEN
        validation_errors := array_append(validation_errors, 'Property name is required');
    END IF;
    
    IF NOT (property_data ? 'purchase_price') OR (property_data->>'purchase_price')::DECIMAL <= 0 THEN
        validation_errors := array_append(validation_errors, 'Valid purchase price is required');
    END IF;
    
    IF NOT (property_data ? 'purchase_date') THEN
        validation_errors := array_append(validation_errors, 'Purchase date is required');
    END IF;
    
    -- エラーがある場合はログに記録
    IF array_length(validation_errors, 1) > 0 THEN
        PERFORM log_error(
            'validation_error',
            'Property data validation failed',
            jsonb_build_object(
                'errors', validation_errors,
                'data', property_data
            ),
            'validate_property_data'
        );
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## 📋 Phase 3: Medium Priority Issues修正

### 3.1 テスト実装

#### 修正手順

**Step 1: テスト用関数の実装**
```sql
-- ファイル: supabase/migrations/20250803_07_test_functions.sql

-- テスト結果テーブル
CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_name TEXT NOT NULL,
    test_category TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
    error_message TEXT,
    execution_time_ms INTEGER,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 包括的テスト実行関数
CREATE OR REPLACE FUNCTION run_comprehensive_tests()
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    error_message TEXT,
    execution_time_ms INTEGER
) AS $$
DECLARE
    test_record RECORD;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time INTEGER;
BEGIN
    -- テスト結果をクリア
    DELETE FROM test_results WHERE executed_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    -- 1. RLSポリシーテスト
    start_time := CURRENT_TIMESTAMP;
    BEGIN
        PERFORM test_rls_policies();
        end_time := CURRENT_TIMESTAMP;
        execution_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
        
        INSERT INTO test_results (test_name, test_category, status, execution_time_ms)
        VALUES ('RLS Policies Test', 'security', 'passed', execution_time);
        
    EXCEPTION
        WHEN OTHERS THEN
            end_time := CURRENT_TIMESTAMP;
            execution_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
            
            INSERT INTO test_results (test_name, test_category, status, error_message, execution_time_ms)
            VALUES ('RLS Policies Test', 'security', 'failed', SQLERRM, execution_time);
    END;
    
    -- 2. データ整合性テスト
    start_time := CURRENT_TIMESTAMP;
    BEGIN
        PERFORM test_data_integrity();
        end_time := CURRENT_TIMESTAMP;
        execution_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
        
        INSERT INTO test_results (test_name, test_category, status, execution_time_ms)
        VALUES ('Data Integrity Test', 'data', 'passed', execution_time);
        
    EXCEPTION
        WHEN OTHERS THEN
            end_time := CURRENT_TIMESTAMP;
            execution_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
            
            INSERT INTO test_results (test_name, test_category, status, error_message, execution_time_ms)
            VALUES ('Data Integrity Test', 'data', 'failed', SQLERRM, execution_time);
    END;
    
    -- 3. パフォーマンステスト
    start_time := CURRENT_TIMESTAMP;
    BEGIN
        PERFORM test_performance();
        end_time := CURRENT_TIMESTAMP;
        execution_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
        
        INSERT INTO test_results (test_name, test_category, status, execution_time_ms)
        VALUES ('Performance Test', 'performance', 'passed', execution_time);
        
    EXCEPTION
        WHEN OTHERS THEN
            end_time := CURRENT_TIMESTAMP;
            execution_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
            
            INSERT INTO test_results (test_name, test_category, status, error_message, execution_time_ms)
            VALUES ('Performance Test', 'performance', 'failed', SQLERRM, execution_time);
    END;
    
    -- 結果を返す
    RETURN QUERY
    SELECT 
        tr.test_name,
        tr.status,
        tr.error_message,
        tr.execution_time_ms
    FROM test_results tr
    WHERE tr.executed_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'
    ORDER BY tr.executed_at;
END;
$$ LANGUAGE plpgsql;

-- RLSポリシーテスト関数
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS VOID AS $$
DECLARE
    test_user_id UUID;
    test_property_id UUID;
    result_count INTEGER;
BEGIN
    -- テストユーザーを作成
    test_user_id := uuid_generate_v4();
    
    -- テスト用のユーザーを挿入（RLSを一時的に無効化）
    SET row_security = off;
    INSERT INTO users (id, email, role) 
    VALUES (test_user_id, 'test@example.com', 'owner');
    SET row_security = on;
    
    -- テスト用の物件を作成
    INSERT INTO properties (user_id, name, property_type, address, prefecture, city, purchase_date, purchase_price)
    VALUES (test_user_id, 'Test Property', 'apartment', 'Test Address', 'Tokyo', 'Shibuya', '2024-01-01', 10000000.00)
    RETURNING id INTO test_property_id;
    
    -- RLSポリシーのテスト
    -- 自分の物件のみアクセス可能かテスト
    SELECT COUNT(*) INTO result_count
    FROM properties
    WHERE user_id = test_user_id;
    
    IF result_count != 1 THEN
        RAISE EXCEPTION 'RLS policy test failed: Expected 1 property, got %', result_count;
    END IF;
    
    -- クリーンアップ
    DELETE FROM properties WHERE id = test_property_id;
    DELETE FROM users WHERE id = test_user_id;
END;
$$ LANGUAGE plpgsql;

-- データ整合性テスト関数
CREATE OR REPLACE FUNCTION test_data_integrity()
RETURNS VOID AS $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- 孤立したレコードの確認
    SELECT COUNT(*) INTO orphaned_count
    FROM rent_rolls rr
    LEFT JOIN properties p ON rr.property_id = p.id
    WHERE p.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Data integrity test failed: Found % orphaned rent_rolls records', orphaned_count;
    END IF;
    
    SELECT COUNT(*) INTO orphaned_count
    FROM loans l
    LEFT JOIN properties p ON l.property_id = p.id
    WHERE p.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Data integrity test failed: Found % orphaned loans records', orphaned_count;
    END IF;
    
    SELECT COUNT(*) INTO orphaned_count
    FROM expenses e
    LEFT JOIN properties p ON e.property_id = p.id
    WHERE p.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Data integrity test failed: Found % orphaned expenses records', orphaned_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- パフォーマンステスト関数
CREATE OR REPLACE FUNCTION test_performance()
RETURNS VOID AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time INTEGER;
BEGIN
    -- 物件検索のパフォーマンステスト
    start_time := CURRENT_TIMESTAMP;
    
    PERFORM COUNT(*)
    FROM properties p
    JOIN rent_rolls rr ON p.id = rr.property_id
    WHERE p.prefecture = 'Tokyo'
    AND rr.room_status = 'occupied';
    
    end_time := CURRENT_TIMESTAMP;
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
    
    IF execution_time > 1000 THEN
        RAISE EXCEPTION 'Performance test failed: Query took %ms (expected <1000ms)', execution_time;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 監視とログ機能の実装

#### 修正手順

**Step 1: パフォーマンス監視関数の実装**
```sql
-- ファイル: supabase/migrations/20250803_08_monitoring.sql

-- パフォーマンス統計テーブル
CREATE TABLE performance_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_unit TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス用
    CONSTRAINT valid_metric_unit CHECK (metric_unit IN ('ms', 'count', 'bytes', 'percent'))
);

-- インデックス作成
CREATE INDEX idx_performance_stats_name_date ON performance_stats(metric_name, recorded_at);

-- システム統計収集関数
CREATE OR REPLACE FUNCTION collect_system_stats()
RETURNS VOID AS $$
DECLARE
    stat_record RECORD;
BEGIN
    -- テーブルサイズ統計
    FOR stat_record IN
        SELECT 
            'table_size_' || schemaname || '_' || tablename as metric_name,
            pg_total_relation_size(schemaname||'.'||tablename) as metric_value
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        INSERT INTO performance_stats (metric_name, metric_value, metric_unit)
        VALUES (stat_record.metric_name, stat_record.metric_value, 'bytes');
    END LOOP;
    
    -- インデックス使用統計
    FOR stat_record IN
        SELECT 
            'index_usage_' || schemaname || '_' || tablename as metric_name,
            COALESCE(idx_scan, 0) as metric_value
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
    LOOP
        INSERT INTO performance_stats (metric_name, metric_value, metric_unit)
        VALUES (stat_record.metric_name, stat_record.metric_value, 'count');
    END LOOP;
    
    -- 古い統計データのクリーンアップ（30日以上前）
    DELETE FROM performance_stats 
    WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- クエリパフォーマンス分析関数
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE (
    query_type TEXT,
    avg_execution_time_ms DECIMAL(10,2),
    max_execution_time_ms DECIMAL(10,2),
    total_calls BIGINT,
    total_time_ms DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH query_stats AS (
        SELECT 
            CASE 
                WHEN query ILIKE '%SELECT%FROM properties%' THEN 'property_search'
                WHEN query ILIKE '%SELECT%FROM rent_rolls%' THEN 'rent_roll_query'
                WHEN query ILIKE '%SELECT%FROM expenses%' THEN 'expense_query'
                WHEN query ILIKE '%SELECT%FROM loans%' THEN 'loan_query'
                WHEN query ILIKE '%INSERT%' THEN 'insert_operation'
                WHEN query ILIKE '%UPDATE%' THEN 'update_operation'
                WHEN query ILIKE '%DELETE%' THEN 'delete_operation'
                ELSE 'other'
            END as query_type,
            mean_exec_time as avg_time,
            max_exec_time as max_time,
            calls,
            total_exec_time as total_time
        FROM pg_stat_statements
        WHERE query NOT ILIKE '%pg_stat_statements%'
        AND query NOT ILIKE '%information_schema%'
    )
    SELECT 
        qs.query_type,
        ROUND(AVG(qs.avg_time), 2) as avg_execution_time_ms,
        ROUND(MAX(qs.max_time), 2) as max_execution_time_ms,
        SUM(qs.calls) as total_calls,
        ROUND(SUM(qs.total_time), 2) as total_time_ms
    FROM query_stats qs
    GROUP BY qs.query_type
    ORDER BY total_time_ms DESC;
END;
$$ LANGUAGE plpgsql;
```

## 🔧 実装手順とベストプラクティス

### 実装順序
1. **Phase 1 (Critical)**: 1週間で実装
   - 外部キー参照修正 → 金額データ型修正 → RLS再設計
2. **Phase 2 (High)**: 2週間で実装
   - トリガー最適化 → インデックス作成 → エラーハンドリング
3. **Phase 3 (Medium)**: 1週間で実装
   - テスト実装 → 監視機能 → ドキュメント更新

### 実装時の注意点

#### データ移行
```sql
-- 既存データの移行例
-- 1. バックアップ作成
CREATE TABLE properties_backup AS SELECT * FROM properties;

-- 2. データ型変更前の値確認
SELECT 
    id, 
    purchase_price,
    purchase_price::DECIMAL(15,2) as new_purchase_price
FROM properties 
LIMIT 5;

-- 3. 段階的な変更実施
BEGIN;
-- 変更実行
ALTER TABLE properties ALTER COLUMN purchase_price TYPE DECIMAL(15,2);
-- 確認
SELECT COUNT(*) FROM properties WHERE purchase_price IS NOT NULL;
COMMIT;
```

#### パフォーマンステスト
```sql
-- インデックス効果の確認
EXPLAIN (ANALYZE, BUFFERS) 
SELECT p.*, COUNT(rr.id) as room_count
FROM properties p
LEFT JOIN rent_rolls rr ON p.id = rr.property_id
WHERE p.user_id = 'user-uuid-here'
AND p.prefecture = 'Tokyo'
GROUP BY p.id;
```

#### セキュリティテスト
```sql
-- RLSポリシーの動作確認
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "test-user-id"}';

-- 他ユーザーのデータにアクセスできないことを確認
SELECT COUNT(*) FROM properties WHERE user_id != 'test-user-id';
-- 結果: 0 (アクセスできない)

RESET ROLE;
```

### 品質保証チェックリスト

#### セキュリティチェック
- [ ] RLSポリシーが全テーブルで有効
- [ ] 権限昇格攻撃の防止
- [ ] SQLインジェクション対策
- [ ] 適切な外部キー制約

#### パフォーマンスチェック
- [ ] 主要クエリの実行時間 < 200ms
- [ ] インデックス使用率 > 90%
- [ ] バッチ処理の最適化
- [ ] メモリ使用量の監視

#### 保守性チェック
- [ ] エラーハンドリングの実装
- [ ] ログ出力機能
- [ ] テストカバレッジ > 90%
- [ ] ドキュメントの更新

この修正指示書に従って実装することで、RichmanManageのデータベーススキーマを企業レベルの品質まで向上させることができます。

