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
    DELETE FROM public.loan_payments WHERE loan_id IN (SELECT id FROM public.loans WHERE loan_name LIKE 'TEST_%');
    DELETE FROM public.loans WHERE loan_name LIKE 'TEST_%';
    DELETE FROM public.rent_rolls WHERE tenant_name LIKE 'TEST_%';
    DELETE FROM public.property_monthly_summaries WHERE property_id IN (SELECT id FROM public.properties WHERE name LIKE 'TEST_%');
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
    
    -- loan_paymentsテーブルの外部キー制約確認
    SELECT COUNT(*) INTO v_orphaned_count
    FROM public.loan_payments lp
    LEFT JOIN public.loans l ON lp.loan_id = l.id
    WHERE l.id IS NULL;
    
    IF v_orphaned_count > 0 THEN
        RAISE EXCEPTION 'Found % orphaned loan_payments records', v_orphaned_count;
    END IF;
    
    -- property_monthly_summariesテーブルの外部キー制約確認
    SELECT COUNT(*) INTO v_orphaned_count
    FROM public.property_monthly_summaries pms
    LEFT JOIN public.properties p ON pms.property_id = p.id
    WHERE p.id IS NULL;
    
    IF v_orphaned_count > 0 THEN
        RAISE EXCEPTION 'Found % orphaned property_monthly_summaries records', v_orphaned_count;
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
    
    -- loansテーブルの金利精度確認
    SELECT COUNT(*) INTO v_invalid_count
    FROM public.loans
    WHERE interest_rate IS NOT NULL 
    AND scale(interest_rate) > 4;
    
    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % loans with invalid interest_rate precision', v_invalid_count;
    END IF;
    
    -- expensesテーブルの金額精度確認
    SELECT COUNT(*) INTO v_invalid_count
    FROM public.expenses
    WHERE amount IS NOT NULL 
    AND scale(amount) != 2;
    
    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % expenses with invalid amount precision', v_invalid_count;
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
    
    -- 無効な金利でのローン作成テスト（失敗すべき）
    v_test_property_id := uuid_generate_v4();
    INSERT INTO public.properties (id, user_id, name, property_type, address, prefecture, city, purchase_date, purchase_price)
    VALUES (v_test_property_id, v_test_user_id, 'TEST_Property', 'apartment', 'Test Address', 'Test Prefecture', 'Test City', CURRENT_DATE, 1000000.00);
    
    v_constraint_violated := FALSE;
    BEGIN
        INSERT INTO public.loans (property_id, loan_name, loan_type, lender_name, principal_amount, interest_rate, loan_term_months, monthly_payment, current_balance, contract_date, first_payment_date)
        VALUES (v_test_property_id, 'TEST_Invalid_Rate', 'mortgage', 'Test Bank', 1000000.00, 101.00, 360, 5000.00, 1000000.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month');
        v_constraint_violated := TRUE;
    EXCEPTION
        WHEN check_violation THEN
            -- 期待される動作
            NULL;
    END;
    
    IF v_constraint_violated THEN
        RAISE EXCEPTION 'Check constraint for interest_rate not working';
    END IF;
    
    -- テストデータのクリーンアップ
    DELETE FROM public.properties WHERE id = v_test_property_id;
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
    v_total_income DECIMAL(15,2);
    v_total_expense DECIMAL(15,2);
    v_cash_flow DECIMAL(15,2);
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
    
    -- property_monthly_summariesの計算フィールドテスト
    INSERT INTO public.property_monthly_summaries (
        property_id, year_month, 
        rental_income, other_income,
        loan_payment, maintenance_expense, utilities_expense, tax_expense, insurance_expense, other_expense
    ) VALUES (
        v_test_property_id, date_trunc('month', CURRENT_DATE),
        80000.00, 5000.00,
        50000.00, 10000.00, 5000.00, 3000.00, 2000.00, 1000.00
    );
    
    -- 生成されたフィールドの検証
    SELECT total_income, total_expense, cash_flow
    INTO v_total_income, v_total_expense, v_cash_flow
    FROM public.property_monthly_summaries
    WHERE property_id = v_test_property_id;
    
    IF v_total_income != 85000.00 THEN
        RAISE EXCEPTION 'total_income calculation failed: expected 85000, got %', v_total_income;
    END IF;
    
    IF v_total_expense != 71000.00 THEN
        RAISE EXCEPTION 'total_expense calculation failed: expected 71000, got %', v_total_expense;
    END IF;
    
    IF v_cash_flow != 14000.00 THEN
        RAISE EXCEPTION 'cash_flow calculation failed: expected 14000, got %', v_cash_flow;
    END IF;
    
    -- テストデータのクリーンアップ
    DELETE FROM public.property_monthly_summaries WHERE property_id = v_test_property_id;
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
-- 注意: この行は実際のテスト実行時にコメントアウトを解除してください
-- SELECT execute_all_tests();

-- テストレポートの生成
-- 注意: この行は実際のテスト実行時にコメントアウトを解除してください
-- SELECT * FROM generate_test_report();

-- 詳細テスト結果の表示
CREATE OR REPLACE VIEW v_test_results AS
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
BEGIN
    RAISE NOTICE 'Validation test script created successfully. To execute tests, uncomment the execution lines in Phase 7.';
END $$;