-- ========================================
-- RichmanManage データベーススキーマ修正
-- Phase 3.1: テスト実装
-- 包括的なテストフレームワークの構築
-- ========================================

-- ========================================
-- テスト結果テーブルの作成
-- ========================================
CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_name TEXT NOT NULL,
    test_category TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
    error_message TEXT,
    execution_time_ms INTEGER,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    executed_by UUID REFERENCES users(id)
);

-- インデックス作成
CREATE INDEX idx_test_results_executed_at ON test_results(executed_at DESC);
CREATE INDEX idx_test_results_category_status ON test_results(test_category, status);

-- コメント追加
COMMENT ON TABLE test_results IS 'テスト実行結果の記録テーブル';
COMMENT ON COLUMN test_results.test_category IS 'テストカテゴリ（security, data, performance, integration）';

-- ========================================
-- テストヘルパー関数
-- ========================================

-- テスト結果記録関数
CREATE OR REPLACE FUNCTION record_test_result(
    p_test_name TEXT,
    p_test_category TEXT,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    INSERT INTO test_results (
        test_name,
        test_category,
        status,
        error_message,
        execution_time_ms,
        executed_by
    ) VALUES (
        p_test_name,
        p_test_category,
        p_status,
        p_error_message,
        p_execution_time_ms,
        auth.uid()
    ) RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- RLSポリシーテスト関数
-- ========================================
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS VOID AS $$
DECLARE
    test_user_id1 UUID;
    test_user_id2 UUID;
    test_property_id1 UUID;
    test_property_id2 UUID;
    result_count INTEGER;
    start_time TIMESTAMPTZ;
    execution_time INTEGER;
BEGIN
    start_time := CURRENT_TIMESTAMP;
    
    -- テストユーザーを作成
    test_user_id1 := uuid_generate_v4();
    test_user_id2 := uuid_generate_v4();
    
    -- RLSを一時的に無効化してテストデータを作成
    SET row_security = off;
    
    BEGIN
        -- テストユーザー1を作成
        INSERT INTO users (id, email, role) 
        VALUES (test_user_id1, 'test_user1@example.com', 'owner');
        
        -- テストユーザー2を作成
        INSERT INTO users (id, email, role) 
        VALUES (test_user_id2, 'test_user2@example.com', 'owner');
        
        -- テストユーザー1の物件を作成
        INSERT INTO properties (id, user_id, name, property_type, address, prefecture, city, purchase_date, purchase_price)
        VALUES (uuid_generate_v4(), test_user_id1, 'Test Property 1', 'apartment', 'Test Address 1', 'Tokyo', 'Shibuya', '2024-01-01', 10000000.00)
        RETURNING id INTO test_property_id1;
        
        -- テストユーザー2の物件を作成
        INSERT INTO properties (id, user_id, name, property_type, address, prefecture, city, purchase_date, purchase_price)
        VALUES (uuid_generate_v4(), test_user_id2, 'Test Property 2', 'apartment', 'Test Address 2', 'Tokyo', 'Shinjuku', '2024-01-01', 20000000.00)
        RETURNING id INTO test_property_id2;
        
        SET row_security = on;
        
        -- テスト1: ユーザー1は自分の物件のみアクセス可能
        SET LOCAL request.jwt.claims TO jsonb_build_object('sub', test_user_id1::TEXT);
        
        SELECT COUNT(*) INTO result_count
        FROM properties
        WHERE user_id = test_user_id1;
        
        IF result_count != 1 THEN
            RAISE EXCEPTION 'RLS test failed: User 1 should see only 1 property, got %', result_count;
        END IF;
        
        -- テスト2: ユーザー1は他人の物件にアクセスできない
        SELECT COUNT(*) INTO result_count
        FROM properties
        WHERE user_id = test_user_id2;
        
        IF result_count != 0 THEN
            RAISE EXCEPTION 'RLS test failed: User 1 should not see User 2 properties, got %', result_count;
        END IF;
        
        -- テスト3: 管理者は全物件にアクセス可能
        UPDATE users SET role = 'admin' WHERE id = test_user_id1;
        
        SELECT COUNT(*) INTO result_count
        FROM properties;
        
        IF result_count != 2 THEN
            RAISE EXCEPTION 'RLS test failed: Admin should see all 2 properties, got %', result_count;
        END IF;
        
        execution_time := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time) * 1000)::INTEGER;
        PERFORM record_test_result('RLS Policy Test', 'security', 'passed', NULL, execution_time);
        
    EXCEPTION
        WHEN OTHERS THEN
            execution_time := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time) * 1000)::INTEGER;
            PERFORM record_test_result('RLS Policy Test', 'security', 'failed', SQLERRM, execution_time);
            RAISE;
    END;
    
    -- クリーンアップ
    SET row_security = off;
    DELETE FROM properties WHERE id IN (test_property_id1, test_property_id2);
    DELETE FROM users WHERE id IN (test_user_id1, test_user_id2);
    SET row_security = on;
    
    RESET request.jwt.claims;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- データ整合性テスト関数
-- ========================================
CREATE OR REPLACE FUNCTION test_data_integrity()
RETURNS VOID AS $$
DECLARE
    orphaned_count INTEGER;
    invalid_count INTEGER;
    start_time TIMESTAMPTZ;
    execution_time INTEGER;
BEGIN
    start_time := CURRENT_TIMESTAMP;
    
    BEGIN
        -- テスト1: 孤立したrent_rollsレコードの確認
        SELECT COUNT(*) INTO orphaned_count
        FROM rent_rolls rr
        LEFT JOIN properties p ON rr.property_id = p.id
        WHERE p.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE EXCEPTION 'Data integrity test failed: Found % orphaned rent_rolls records', orphaned_count;
        END IF;
        
        -- テスト2: 孤立したloansレコードの確認
        SELECT COUNT(*) INTO orphaned_count
        FROM loans l
        LEFT JOIN properties p ON l.property_id = p.id
        WHERE p.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE EXCEPTION 'Data integrity test failed: Found % orphaned loans records', orphaned_count;
        END IF;
        
        -- テスト3: 孤立したexpensesレコードの確認
        SELECT COUNT(*) INTO orphaned_count
        FROM expenses e
        LEFT JOIN properties p ON e.property_id = p.id
        WHERE p.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE EXCEPTION 'Data integrity test failed: Found % orphaned expenses records', orphaned_count;
        END IF;
        
        -- テスト4: 孤立したloan_paymentsレコードの確認
        SELECT COUNT(*) INTO orphaned_count
        FROM loan_payments lp
        LEFT JOIN loans l ON lp.loan_id = l.id
        WHERE l.id IS NULL;
        
        IF orphaned_count > 0 THEN
            RAISE EXCEPTION 'Data integrity test failed: Found % orphaned loan_payments records', orphaned_count;
        END IF;
        
        -- テスト5: 不正な金額データの確認
        SELECT COUNT(*) INTO invalid_count
        FROM properties
        WHERE purchase_price < 0 OR current_valuation < 0;
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Data integrity test failed: Found % properties with negative amounts', invalid_count;
        END IF;
        
        -- テスト6: 不正な日付データの確認
        SELECT COUNT(*) INTO invalid_count
        FROM loans
        WHERE disbursement_date < contract_date
        OR first_payment_date <= disbursement_date
        OR final_payment_date < first_payment_date;
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Data integrity test failed: Found % loans with invalid dates', invalid_count;
        END IF;
        
        execution_time := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time) * 1000)::INTEGER;
        PERFORM record_test_result('Data Integrity Test', 'data', 'passed', NULL, execution_time);
        
    EXCEPTION
        WHEN OTHERS THEN
            execution_time := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time) * 1000)::INTEGER;
            PERFORM record_test_result('Data Integrity Test', 'data', 'failed', SQLERRM, execution_time);
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- パフォーマンステスト関数
-- ========================================
CREATE OR REPLACE FUNCTION test_performance()
RETURNS VOID AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time INTEGER;
    query_time INTEGER;
BEGIN
    start_time := CURRENT_TIMESTAMP;
    
    BEGIN
        -- テスト1: 物件検索のパフォーマンス
        start_time := CURRENT_TIMESTAMP;
        
        PERFORM COUNT(*)
        FROM properties p
        JOIN rent_rolls rr ON p.id = rr.property_id
        WHERE p.prefecture = 'Tokyo'
        AND rr.room_status = 'occupied'
        AND p.deleted_at IS NULL
        AND rr.deleted_at IS NULL;
        
        end_time := CURRENT_TIMESTAMP;
        query_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
        
        IF query_time > 200 THEN
            RAISE EXCEPTION 'Performance test failed: Property search query took %ms (expected <200ms)', query_time;
        END IF;
        
        -- テスト2: 月次集計のパフォーマンス
        start_time := CURRENT_TIMESTAMP;
        
        PERFORM COUNT(*)
        FROM property_monthly_summaries pms
        JOIN properties p ON pms.property_id = p.id
        WHERE pms.year_month >= CURRENT_DATE - INTERVAL '12 months'
        AND p.deleted_at IS NULL;
        
        end_time := CURRENT_TIMESTAMP;
        query_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
        
        IF query_time > 100 THEN
            RAISE EXCEPTION 'Performance test failed: Monthly summary query took %ms (expected <100ms)', query_time;
        END IF;
        
        -- テスト3: 支出集計のパフォーマンス
        start_time := CURRENT_TIMESTAMP;
        
        PERFORM 
            property_id,
            category,
            SUM(amount) as total_amount
        FROM expenses
        WHERE expense_date >= CURRENT_DATE - INTERVAL '1 year'
        AND deleted_at IS NULL
        GROUP BY property_id, category;
        
        end_time := CURRENT_TIMESTAMP;
        query_time := EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
        
        IF query_time > 300 THEN
            RAISE EXCEPTION 'Performance test failed: Expense aggregation query took %ms (expected <300ms)', query_time;
        END IF;
        
        execution_time := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time) * 1000)::INTEGER;
        PERFORM record_test_result('Performance Test', 'performance', 'passed', NULL, execution_time);
        
    EXCEPTION
        WHEN OTHERS THEN
            execution_time := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time) * 1000)::INTEGER;
            PERFORM record_test_result('Performance Test', 'performance', 'failed', SQLERRM, execution_time);
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 統合テスト実行関数
-- ========================================
CREATE OR REPLACE FUNCTION run_comprehensive_tests()
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    error_message TEXT,
    execution_time_ms INTEGER
) AS $$
DECLARE
    test_record RECORD;
BEGIN
    -- テスト結果をクリア（1時間以上前のもの）
    DELETE FROM test_results WHERE executed_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    -- 各テストを実行
    -- 1. RLSポリシーテスト
    BEGIN
        PERFORM test_rls_policies();
    EXCEPTION
        WHEN OTHERS THEN
            -- エラーは記録済み
    END;
    
    -- 2. データ整合性テスト
    BEGIN
        PERFORM test_data_integrity();
    EXCEPTION
        WHEN OTHERS THEN
            -- エラーは記録済み
    END;
    
    -- 3. パフォーマンステスト
    BEGIN
        PERFORM test_performance();
    EXCEPTION
        WHEN OTHERS THEN
            -- エラーは記録済み
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

-- ========================================
-- テスト自動化スケジュール関数
-- ========================================
CREATE OR REPLACE FUNCTION schedule_automated_tests()
RETURNS VOID AS $$
BEGIN
    -- 毎日深夜に実行するテストをスケジュール
    -- （実際のスケジューリングはpg_cronまたは外部ツールで行う）
    
    -- テスト実行
    PERFORM run_comprehensive_tests();
    
    -- 失敗したテストがある場合はアラート
    IF EXISTS (
        SELECT 1 FROM test_results 
        WHERE status = 'failed' 
        AND executed_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
    ) THEN
        -- アラート処理（実装は環境に応じて）
        RAISE NOTICE 'Test failures detected. Check test_results table for details.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- テスト結果のRLSポリシー
-- ========================================
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- 管理者のみ参照可能
CREATE POLICY test_results_admin_only ON test_results
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- ========================================
-- テストサマリービュー
-- ========================================
CREATE OR REPLACE VIEW v_test_summary AS
WITH recent_tests AS (
    SELECT 
        test_category,
        status,
        COUNT(*) as test_count,
        AVG(execution_time_ms) as avg_execution_time,
        MAX(execution_time_ms) as max_execution_time,
        MAX(executed_at) as last_executed
    FROM test_results
    WHERE executed_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY test_category, status
)
SELECT 
    test_category,
    SUM(CASE WHEN status = 'passed' THEN test_count ELSE 0 END) as passed_count,
    SUM(CASE WHEN status = 'failed' THEN test_count ELSE 0 END) as failed_count,
    SUM(CASE WHEN status = 'skipped' THEN test_count ELSE 0 END) as skipped_count,
    ROUND(AVG(avg_execution_time), 2) as avg_execution_time_ms,
    MAX(max_execution_time) as max_execution_time_ms,
    MAX(last_executed) as last_executed,
    CASE 
        WHEN SUM(CASE WHEN status = 'failed' THEN test_count ELSE 0 END) > 0 THEN 'FAILING'
        WHEN SUM(test_count) = 0 THEN 'NOT_RUN'
        ELSE 'PASSING'
    END as overall_status
FROM recent_tests
GROUP BY test_category
ORDER BY test_category;

-- コメント追加
COMMENT ON FUNCTION test_rls_policies IS 'Row Level Securityポリシーの動作確認テスト';
COMMENT ON FUNCTION test_data_integrity IS 'データ整合性チェックテスト';
COMMENT ON FUNCTION test_performance IS 'クエリパフォーマンステスト';
COMMENT ON FUNCTION run_comprehensive_tests IS '包括的テストスイートの実行';
COMMENT ON VIEW v_test_summary IS '過去24時間のテスト結果サマリー';