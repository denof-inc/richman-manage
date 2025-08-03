-- 20250104_99_rollback_procedures.sql
-- RichmanManage データベーススキーマロールバック手順
-- 作成日: 2025-01-04
-- 目的: 緊急時の安全なロールバック手順の提供

-- =============================================================================
-- 重要: ロールバック実行前の確認事項
-- =============================================================================
-- 1. 本番環境のフルバックアップが存在することを確認
-- 2. ロールバックの影響範囲を十分に理解していることを確認
-- 3. ユーザーへの通知が完了していることを確認
-- 4. ロールバック実行権限を持っていることを確認

-- =============================================================================
-- Phase 1: ロールバック前診断
-- =============================================================================

-- 1.1 現在のスキーマ状態確認
CREATE OR REPLACE FUNCTION check_current_schema_state()
RETURNS TABLE(
    schema_name TEXT,
    table_count BIGINT,
    total_records BIGINT,
    status TEXT
) AS $$
BEGIN
    -- publicスキーマの状態確認
    RETURN QUERY
    SELECT 
        'public'::TEXT,
        COUNT(DISTINCT tablename)::BIGINT,
        SUM(n_live_tup)::BIGINT,
        'CURRENT'::TEXT
    FROM pg_stat_user_tables
    WHERE schemaname = 'public';
    
    -- バックアップスキーマの状態確認
    RETURN QUERY
    SELECT 
        'richman_old_20250104'::TEXT,
        COUNT(DISTINCT tablename)::BIGINT,
        SUM(n_live_tup)::BIGINT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'richman_old_20250104')
            THEN 'AVAILABLE'
            ELSE 'NOT_FOUND'
        END
    FROM pg_stat_user_tables
    WHERE schemaname = 'richman_old_20250104';
    
    -- backup_20250104スキーマの状態確認
    RETURN QUERY
    SELECT 
        'backup_20250104'::TEXT,
        COUNT(DISTINCT tablename)::BIGINT,
        SUM(n_live_tup)::BIGINT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'backup_20250104')
            THEN 'AVAILABLE'
            ELSE 'NOT_FOUND'
        END
    FROM pg_stat_user_tables
    WHERE schemaname = 'backup_20250104';
END;
$$ LANGUAGE plpgsql;

-- 1.2 ロールバック可能性チェック
CREATE OR REPLACE FUNCTION check_rollback_feasibility()
RETURNS TABLE(
    check_item TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- 旧スキーマの存在確認
    RETURN QUERY
    SELECT 
        'old_schema_exists'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'richman_old_20250104')
            THEN 'PASS'
            ELSE 'FAIL'
        END,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'richman_old_20250104')
            THEN 'Old schema is available for rollback'
            ELSE 'Old schema not found - rollback not possible'
        END;
    
    -- バックアップテーブルの存在確認
    RETURN QUERY
    SELECT 
        'backup_tables_exist'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'backup_20250104')
            THEN 'PASS'
            ELSE 'FAIL'
        END,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'backup_20250104')
            THEN 'Backup tables are available'
            ELSE 'Backup tables not found - data recovery may not be possible'
        END;
    
    -- アクティブな接続の確認
    RETURN QUERY
    SELECT 
        'active_connections'::TEXT,
        CASE 
            WHEN COUNT(*) > 1
            THEN 'WARNING'
            ELSE 'PASS'
        END,
        'Active connections: ' || COUNT(*)::TEXT
    FROM pg_stat_activity
    WHERE datname = current_database()
    AND pid != pg_backend_pid();
    
    -- 実行中のトランザクションの確認
    RETURN QUERY
    SELECT 
        'running_transactions'::TEXT,
        CASE 
            WHEN COUNT(*) > 0
            THEN 'WARNING'
            ELSE 'PASS'
        END,
        'Running transactions: ' || COUNT(*)::TEXT
    FROM pg_stat_activity
    WHERE datname = current_database()
    AND state != 'idle'
    AND pid != pg_backend_pid();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 2: ロールバック実行手順
-- =============================================================================

-- 2.1 アクティブな接続の終了
CREATE OR REPLACE FUNCTION terminate_active_connections()
RETURNS VOID AS $$
DECLARE
    v_terminated_count INTEGER := 0;
BEGIN
    -- 現在のセッション以外の全接続を終了
    SELECT COUNT(*)
    INTO v_terminated_count
    FROM pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = current_database()
    AND pid != pg_backend_pid();
    
    RAISE NOTICE 'Terminated % active connections', v_terminated_count;
    
    -- 短時間待機
    PERFORM pg_sleep(2);
END;
$$ LANGUAGE plpgsql;

-- 2.2 スキーマロールバック関数
CREATE OR REPLACE FUNCTION execute_schema_rollback()
RETURNS VOID AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    v_start_time := CURRENT_TIMESTAMP;
    
    -- ロールバック開始ログ
    INSERT INTO migration_log (migration_name, phase, status, details)
    VALUES ('schema_rollback', 'rollback_start', 'started', 
            jsonb_build_object('timestamp', v_start_time));
    
    -- 現在のpublicスキーマを一時的に退避
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
        ALTER SCHEMA public RENAME TO richman_failed_20250104;
        RAISE NOTICE 'Current public schema renamed to richman_failed_20250104';
    END IF;
    
    -- 旧スキーマをpublicに戻す
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'richman_old_20250104') THEN
        ALTER SCHEMA richman_old_20250104 RENAME TO public;
        RAISE NOTICE 'Old schema restored as public';
    ELSE
        RAISE EXCEPTION 'Old schema not found - cannot rollback';
    END IF;
    
    v_end_time := CURRENT_TIMESTAMP;
    
    -- ロールバック完了ログ
    INSERT INTO migration_log (migration_name, phase, status, completed_at, details)
    VALUES ('schema_rollback', 'rollback_complete', 'completed', v_end_time,
            jsonb_build_object('duration_seconds', EXTRACT(EPOCH FROM (v_end_time - v_start_time))));
    
    RAISE NOTICE 'Schema rollback completed successfully';
END;
$$ LANGUAGE plpgsql;

-- 2.3 データ復元関数（必要に応じて）
CREATE OR REPLACE FUNCTION restore_data_from_backup()
RETURNS VOID AS $$
DECLARE
    v_table_name TEXT;
    v_restored_count INTEGER := 0;
BEGIN
    -- バックアップスキーマが存在するか確認
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'backup_20250104') THEN
        RAISE EXCEPTION 'Backup schema not found';
    END IF;
    
    -- 各テーブルのデータを復元
    FOR v_table_name IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'backup_20250104'
        AND tablename LIKE '%_backup'
    LOOP
        -- バックアップテーブルから元のテーブル名を取得
        v_table_name := regexp_replace(v_table_name, '_backup$', '');
        
        -- データの復元
        EXECUTE format('
            INSERT INTO public.%I
            SELECT * FROM backup_20250104.%I
            ON CONFLICT DO NOTHING',
            v_table_name, v_table_name || '_backup'
        );
        
        v_restored_count := v_restored_count + 1;
        RAISE NOTICE 'Restored data for table: %', v_table_name;
    END LOOP;
    
    RAISE NOTICE 'Data restoration completed for % tables', v_restored_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 3: ロールバック後の検証
-- =============================================================================

-- 3.1 ロールバック検証関数
CREATE OR REPLACE FUNCTION verify_rollback()
RETURNS TABLE(
    check_item TEXT,
    expected TEXT,
    actual TEXT,
    status TEXT
) AS $$
BEGIN
    -- スキーマ状態の確認
    RETURN QUERY
    SELECT 
        'schema_state'::TEXT,
        'public schema exists'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public')
            THEN 'public schema exists'
            ELSE 'public schema missing'
        END,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public')
            THEN 'PASS'
            ELSE 'FAIL'
        END;
    
    -- テーブル構造の確認
    RETURN QUERY
    SELECT 
        'table_structure'::TEXT,
        'Original structure'::TEXT,
        'Tables: ' || COUNT(*)::TEXT,
        'CHECK_MANUALLY'::TEXT
    FROM pg_tables
    WHERE schemaname = 'public';
    
    -- データ整合性の確認
    RETURN QUERY
    SELECT 
        'data_integrity'::TEXT,
        'All data present'::TEXT,
        'Total records: ' || SUM(n_live_tup)::TEXT,
        'CHECK_MANUALLY'::TEXT
    FROM pg_stat_user_tables
    WHERE schemaname = 'public';
    
    -- RLSポリシーの確認
    RETURN QUERY
    SELECT 
        'rls_policies'::TEXT,
        'Policies active'::TEXT,
        'Tables with RLS: ' || COUNT(DISTINCT tablename)::TEXT,
        CASE 
            WHEN COUNT(DISTINCT tablename) > 0
            THEN 'PASS'
            ELSE 'WARNING'
        END
    FROM pg_policies
    WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql;

-- 3.2 アプリケーション接続テスト
CREATE OR REPLACE FUNCTION test_application_connectivity()
RETURNS TABLE(
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
BEGIN
    -- ユーザーテーブルへのアクセステスト
    RETURN QUERY
    SELECT 
        'user_table_access'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM public.users LIMIT 1)
            THEN 'SUCCESS'
            ELSE 'FAIL'
        END,
        'User table accessibility check'::TEXT;
    
    -- プロパティテーブルへのアクセステスト
    RETURN QUERY
    SELECT 
        'property_table_access'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM public.properties LIMIT 1)
            THEN 'SUCCESS'
            ELSE 'FAIL'
        END,
        'Property table accessibility check'::TEXT;
    
    -- RLS動作テスト
    RETURN QUERY
    SELECT 
        'rls_functionality'::TEXT,
        'CHECK_MANUALLY'::TEXT,
        'RLS policies need manual verification'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 4: 緊急ロールバック実行手順
-- =============================================================================

-- 4.1 完全ロールバック実行関数
CREATE OR REPLACE FUNCTION execute_emergency_rollback()
RETURNS VOID AS $$
BEGIN
    RAISE NOTICE 'Starting emergency rollback procedure...';
    
    -- Step 1: 現在の状態を確認
    RAISE NOTICE 'Step 1: Checking current state...';
    PERFORM check_current_schema_state();
    
    -- Step 2: ロールバック可能性を確認
    RAISE NOTICE 'Step 2: Checking rollback feasibility...';
    PERFORM check_rollback_feasibility();
    
    -- Step 3: アクティブな接続を終了
    RAISE NOTICE 'Step 3: Terminating active connections...';
    PERFORM terminate_active_connections();
    
    -- Step 4: スキーマロールバックを実行
    RAISE NOTICE 'Step 4: Executing schema rollback...';
    PERFORM execute_schema_rollback();
    
    -- Step 5: ロールバックを検証
    RAISE NOTICE 'Step 5: Verifying rollback...';
    PERFORM verify_rollback();
    
    RAISE NOTICE 'Emergency rollback completed. Please verify application functionality.';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Phase 5: クリーンアップ手順
-- =============================================================================

-- 5.1 失敗したスキーマのクリーンアップ
CREATE OR REPLACE FUNCTION cleanup_failed_migration()
RETURNS VOID AS $$
BEGIN
    -- 失敗したスキーマの削除（確認後に実行）
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'richman_failed_20250104') THEN
        -- 注意: この操作は元に戻せません
        -- DROP SCHEMA richman_failed_20250104 CASCADE;
        RAISE NOTICE 'Failed schema exists: richman_failed_20250104. Manual cleanup required.';
    END IF;
    
    -- 一時的なオブジェクトのクリーンアップ
    DROP TABLE IF EXISTS migration_log;
    DROP TABLE IF EXISTS data_migration_status;
    DROP TABLE IF EXISTS migration_errors;
    
    RAISE NOTICE 'Cleanup completed. Review and manually remove failed schemas if needed.';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 使用方法
-- =============================================================================

-- 注意: 以下のコマンドは緊急時のみ実行してください

-- 1. 現在の状態確認
-- SELECT * FROM check_current_schema_state();

-- 2. ロールバック可能性確認
-- SELECT * FROM check_rollback_feasibility();

-- 3. 緊急ロールバック実行（慎重に実行）
-- SELECT execute_emergency_rollback();

-- 4. ロールバック後の検証
-- SELECT * FROM verify_rollback();
-- SELECT * FROM test_application_connectivity();

-- 5. クリーンアップ（ロールバック成功確認後）
-- SELECT cleanup_failed_migration();

-- 最終メッセージ
DO $$
BEGIN
    RAISE NOTICE 'Rollback procedures created successfully. Use with extreme caution in emergency situations only.';
END $$;