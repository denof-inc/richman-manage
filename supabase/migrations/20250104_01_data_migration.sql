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
                WHEN 'loan_payments' THEN
                    PERFORM migrate_loan_payments_batch(p_batch_size, v_last_id);
                WHEN 'property_monthly_summaries' THEN
                    PERFORM migrate_property_monthly_summaries_batch(p_batch_size, v_last_id);
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

-- rent_rollsテーブル移行
CREATE OR REPLACE FUNCTION migrate_rent_rolls_batch(
    p_batch_size INTEGER,
    INOUT p_last_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_record IN
        SELECT * FROM rent_rolls 
        WHERE (p_last_id IS NULL OR id > p_last_id)
        AND property_id IN (SELECT id FROM public.properties)
        ORDER BY id
        LIMIT p_batch_size
    LOOP
        BEGIN
            INSERT INTO public.rent_rolls (
                id, property_id, room_number, tenant_name,
                monthly_rent, monthly_management_fee, deposit, key_money,
                lease_start_date, lease_end_date, room_status,
                created_at, updated_at, deleted_at
            ) VALUES (
                v_record.id, v_record.property_id, v_record.room_number, v_record.tenant_name,
                v_record.monthly_rent::DECIMAL(10,2),
                v_record.monthly_management_fee::DECIMAL(10,2),
                v_record.deposit::DECIMAL(10,2),
                v_record.key_money::DECIMAL(10,2),
                v_record.lease_start_date, v_record.lease_end_date,
                CASE 
                    WHEN v_record.room_status = 'occupied' THEN 'occupied'::room_status
                    WHEN v_record.room_status = 'vacant' THEN 'vacant'::room_status
                    ELSE 'maintenance'::room_status
                END,
                v_record.created_at, v_record.updated_at, v_record.deleted_at
            ) ON CONFLICT (id) DO UPDATE SET
                room_number = EXCLUDED.room_number,
                tenant_name = EXCLUDED.tenant_name,
                monthly_rent = EXCLUDED.monthly_rent,
                room_status = EXCLUDED.room_status,
                updated_at = CURRENT_TIMESTAMP;
            
            v_count := v_count + 1;
            p_last_id := v_record.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                INSERT INTO migration_errors (table_name, record_id, error_message, error_context)
                VALUES ('rent_rolls', v_record.id, SQLERRM, 
                        jsonb_build_object('property_id', v_record.property_id));
                CONTINUE;
        END;
    END LOOP;
    
    RAISE DEBUG 'Migrated % rent_rolls records in this batch', v_count;
END;
$$ LANGUAGE plpgsql;

-- loansテーブル移行
CREATE OR REPLACE FUNCTION migrate_loans_batch(
    p_batch_size INTEGER,
    INOUT p_last_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_record IN
        SELECT * FROM loans 
        WHERE (p_last_id IS NULL OR id > p_last_id)
        AND property_id IN (SELECT id FROM public.properties)
        ORDER BY id
        LIMIT p_batch_size
    LOOP
        BEGIN
            INSERT INTO public.loans (
                id, property_id, loan_name, loan_type, lender_name,
                principal_amount, interest_rate, loan_term_months,
                monthly_payment, current_balance,
                contract_date, disbursement_date, first_payment_date, final_payment_date,
                created_at, updated_at, deleted_at
            ) VALUES (
                v_record.id, v_record.property_id, v_record.loan_name,
                CASE 
                    WHEN v_record.loan_type = 'mortgage' THEN 'mortgage'::loan_type
                    WHEN v_record.loan_type = 'personal' THEN 'personal'::loan_type
                    WHEN v_record.loan_type = 'business' THEN 'business'::loan_type
                    WHEN v_record.loan_type = 'renovation' THEN 'renovation'::loan_type
                    ELSE 'other'::loan_type
                END,
                v_record.lender_name,
                v_record.principal_amount::DECIMAL(15,2),
                v_record.interest_rate::DECIMAL(6,4),
                v_record.loan_term_months,
                v_record.monthly_payment::DECIMAL(10,2),
                v_record.current_balance::DECIMAL(15,2),
                v_record.contract_date, v_record.disbursement_date, 
                v_record.first_payment_date, v_record.final_payment_date,
                v_record.created_at, v_record.updated_at, v_record.deleted_at
            ) ON CONFLICT (id) DO UPDATE SET
                loan_name = EXCLUDED.loan_name,
                loan_type = EXCLUDED.loan_type,
                current_balance = EXCLUDED.current_balance,
                updated_at = CURRENT_TIMESTAMP;
            
            v_count := v_count + 1;
            p_last_id := v_record.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                INSERT INTO migration_errors (table_name, record_id, error_message, error_context)
                VALUES ('loans', v_record.id, SQLERRM, 
                        jsonb_build_object('property_id', v_record.property_id, 'loan_name', v_record.loan_name));
                CONTINUE;
        END;
    END LOOP;
    
    RAISE DEBUG 'Migrated % loans records in this batch', v_count;
END;
$$ LANGUAGE plpgsql;

-- expensesテーブル移行
CREATE OR REPLACE FUNCTION migrate_expenses_batch(
    p_batch_size INTEGER,
    INOUT p_last_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_record IN
        SELECT * FROM expenses 
        WHERE (p_last_id IS NULL OR id > p_last_id)
        AND property_id IN (SELECT id FROM public.properties)
        ORDER BY id
        LIMIT p_batch_size
    LOOP
        BEGIN
            INSERT INTO public.expenses (
                id, property_id, expense_name, category,
                amount, expense_date, description, receipt_url,
                created_at, updated_at, deleted_at
            ) VALUES (
                v_record.id, v_record.property_id, v_record.expense_name,
                CASE 
                    WHEN v_record.category = 'maintenance' THEN 'maintenance'::expense_category
                    WHEN v_record.category = 'utilities' THEN 'utilities'::expense_category
                    WHEN v_record.category = 'insurance' THEN 'insurance'::expense_category
                    WHEN v_record.category = 'tax' THEN 'tax'::expense_category
                    WHEN v_record.category = 'cleaning' THEN 'cleaning'::expense_category
                    WHEN v_record.category = 'repair' THEN 'repair'::expense_category
                    WHEN v_record.category = 'renovation' THEN 'renovation'::expense_category
                    WHEN v_record.category = 'advertising' THEN 'advertising'::expense_category
                    WHEN v_record.category = 'legal' THEN 'legal'::expense_category
                    WHEN v_record.category = 'accounting' THEN 'accounting'::expense_category
                    ELSE 'other'::expense_category
                END,
                v_record.amount::DECIMAL(15,2),
                v_record.expense_date, v_record.description, v_record.receipt_url,
                v_record.created_at, v_record.updated_at, v_record.deleted_at
            ) ON CONFLICT (id) DO UPDATE SET
                expense_name = EXCLUDED.expense_name,
                category = EXCLUDED.category,
                amount = EXCLUDED.amount,
                updated_at = CURRENT_TIMESTAMP;
            
            v_count := v_count + 1;
            p_last_id := v_record.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                INSERT INTO migration_errors (table_name, record_id, error_message, error_context)
                VALUES ('expenses', v_record.id, SQLERRM, 
                        jsonb_build_object('property_id', v_record.property_id, 'expense_name', v_record.expense_name));
                CONTINUE;
        END;
    END LOOP;
    
    RAISE DEBUG 'Migrated % expenses records in this batch', v_count;
END;
$$ LANGUAGE plpgsql;

-- loan_paymentsテーブル移行
CREATE OR REPLACE FUNCTION migrate_loan_payments_batch(
    p_batch_size INTEGER,
    INOUT p_last_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_record IN
        SELECT * FROM loan_payments 
        WHERE (p_last_id IS NULL OR id > p_last_id)
        AND loan_id IN (SELECT id FROM public.loans)
        ORDER BY id
        LIMIT p_batch_size
    LOOP
        BEGIN
            INSERT INTO public.loan_payments (
                id, loan_id,
                payment_date, payment_amount, principal_portion, interest_portion, balance_after_payment,
                is_prepayment,
                created_at, updated_at, deleted_at
            ) VALUES (
                v_record.id, v_record.loan_id,
                v_record.payment_date,
                v_record.payment_amount::DECIMAL(10,2),
                v_record.principal_portion::DECIMAL(10,2),
                v_record.interest_portion::DECIMAL(10,2),
                v_record.balance_after_payment::DECIMAL(15,2),
                v_record.is_prepayment,
                v_record.created_at, v_record.updated_at, v_record.deleted_at
            ) ON CONFLICT (id) DO UPDATE SET
                payment_amount = EXCLUDED.payment_amount,
                principal_portion = EXCLUDED.principal_portion,
                interest_portion = EXCLUDED.interest_portion,
                balance_after_payment = EXCLUDED.balance_after_payment,
                updated_at = CURRENT_TIMESTAMP;
            
            v_count := v_count + 1;
            p_last_id := v_record.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                INSERT INTO migration_errors (table_name, record_id, error_message, error_context)
                VALUES ('loan_payments', v_record.id, SQLERRM, 
                        jsonb_build_object('loan_id', v_record.loan_id, 'payment_date', v_record.payment_date));
                CONTINUE;
        END;
    END LOOP;
    
    RAISE DEBUG 'Migrated % loan_payments records in this batch', v_count;
END;
$$ LANGUAGE plpgsql;

-- property_monthly_summariesテーブル移行
CREATE OR REPLACE FUNCTION migrate_property_monthly_summaries_batch(
    p_batch_size INTEGER,
    INOUT p_last_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_record IN
        SELECT * FROM property_monthly_summaries 
        WHERE (p_last_id IS NULL OR id > p_last_id)
        AND property_id IN (SELECT id FROM public.properties)
        ORDER BY id
        LIMIT p_batch_size
    LOOP
        BEGIN
            INSERT INTO public.property_monthly_summaries (
                id, property_id, year_month,
                rental_income, other_income,
                loan_payment, maintenance_expense, utilities_expense, tax_expense, insurance_expense, other_expense,
                occupancy_rate,
                created_at, updated_at
            ) VALUES (
                v_record.id, v_record.property_id, v_record.year_month,
                v_record.rental_income::DECIMAL(15,2),
                v_record.other_income::DECIMAL(15,2),
                v_record.loan_payment::DECIMAL(15,2),
                v_record.maintenance_expense::DECIMAL(15,2),
                v_record.utilities_expense::DECIMAL(15,2),
                v_record.tax_expense::DECIMAL(15,2),
                v_record.insurance_expense::DECIMAL(15,2),
                v_record.other_expense::DECIMAL(15,2),
                v_record.occupancy_rate::DECIMAL(5,2),
                v_record.created_at, v_record.updated_at
            ) ON CONFLICT (id) DO UPDATE SET
                rental_income = EXCLUDED.rental_income,
                loan_payment = EXCLUDED.loan_payment,
                occupancy_rate = EXCLUDED.occupancy_rate,
                updated_at = CURRENT_TIMESTAMP;
            
            v_count := v_count + 1;
            p_last_id := v_record.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                INSERT INTO migration_errors (table_name, record_id, error_message, error_context)
                VALUES ('property_monthly_summaries', v_record.id, SQLERRM, 
                        jsonb_build_object('property_id', v_record.property_id, 'year_month', v_record.year_month));
                CONTINUE;
        END;
    END LOOP;
    
    RAISE DEBUG 'Migrated % property_monthly_summaries records in this batch', v_count;
END;
$$ LANGUAGE plpgsql;

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
    v_tables TEXT[] := ARRAY['users', 'properties', 'rent_rolls', 'loans', 'expenses', 'loan_payments', 'property_monthly_summaries'];
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
        AND scale(purchase_price) != 2
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
-- 注意: この行は実際の移行時にコメントアウトを解除してください
-- SELECT execute_data_migration();

-- 5.2 整合性検証
-- 注意: この行は実際の移行時にコメントアウトを解除してください
-- SELECT * FROM verify_migration_integrity();

-- 5.3 パフォーマンス検証
-- 注意: この行は実際の移行時にコメントアウトを解除してください
-- SELECT * FROM verify_migration_performance();

-- 5.4 移行サマリーレポート
CREATE OR REPLACE VIEW v_migration_summary AS
SELECT 
    table_name,
    total_records,
    migrated_records,
    failed_records,
    ROUND((migrated_records::FLOAT / NULLIF(total_records, 0) * 100), 2) as success_rate,
    status,
    EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM data_migration_status
ORDER BY table_name;

-- 5.5 エラーサマリー
CREATE OR REPLACE VIEW v_migration_errors AS
SELECT 
    table_name,
    COUNT(*) as error_count,
    array_agg(DISTINCT substring(error_message, 1, 100)) as error_types
FROM migration_errors
GROUP BY table_name
ORDER BY error_count DESC;

-- 最終メッセージ
DO $$
BEGIN
    RAISE NOTICE 'Data migration script created successfully. To execute migration, uncomment the execution lines in Phase 5.';
END $$;