-- ========================================
-- RichmanManage データベーススキーマ修正
-- Phase 3.2: 監視とログ機能の実装
-- 包括的なシステム監視とパフォーマンス分析
-- ========================================

-- ========================================
-- パフォーマンス統計テーブルの作成
-- ========================================
CREATE TABLE performance_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_unit TEXT NOT NULL,
    metadata JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT valid_metric_unit CHECK (metric_unit IN ('ms', 'count', 'bytes', 'percent', 'ratio'))
);

-- インデックス作成
CREATE INDEX idx_performance_stats_name_date ON performance_stats(metric_name, recorded_at);
CREATE INDEX idx_performance_stats_recorded_at ON performance_stats(recorded_at DESC);

-- コメント追加
COMMENT ON TABLE performance_stats IS 'システムパフォーマンス統計記録テーブル';
COMMENT ON COLUMN performance_stats.metric_name IS 'メトリクス名（例: table_size_properties, query_time_property_search）';
COMMENT ON COLUMN performance_stats.metric_unit IS '単位（ms: ミリ秒, count: 件数, bytes: バイト数, percent: パーセント, ratio: 比率）';
COMMENT ON COLUMN performance_stats.metadata IS '追加のメタデータ（JSON形式）';

-- ========================================
-- システム統計収集関数
-- ========================================
CREATE OR REPLACE FUNCTION collect_system_stats()
RETURNS VOID AS $$
DECLARE
    stat_record RECORD;
    table_count INTEGER;
    index_count INTEGER;
    total_size BIGINT;
BEGIN
    -- テーブルサイズ統計
    FOR stat_record IN
        SELECT 
            'table_size_' || tablename as metric_name,
            pg_total_relation_size(schemaname||'.'||tablename) as metric_value,
            tablename
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
    LOOP
        INSERT INTO performance_stats (metric_name, metric_value, metric_unit, metadata)
        VALUES (
            stat_record.metric_name, 
            stat_record.metric_value, 
            'bytes',
            jsonb_build_object('table_name', stat_record.tablename)
        );
    END LOOP;
    
    -- インデックス使用統計
    FOR stat_record IN
        SELECT 
            'index_usage_' || tablename as metric_name,
            COALESCE(SUM(idx_scan), 0) as metric_value,
            tablename,
            COUNT(*) as index_count
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        GROUP BY tablename
    LOOP
        INSERT INTO performance_stats (metric_name, metric_value, metric_unit, metadata)
        VALUES (
            stat_record.metric_name, 
            stat_record.metric_value, 
            'count',
            jsonb_build_object(
                'table_name', stat_record.tablename,
                'index_count', stat_record.index_count
            )
        );
    END LOOP;
    
    -- データベース全体の統計
    SELECT 
        COUNT(*) as table_count,
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as index_count,
        SUM(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
    INTO table_count, index_count, total_size
    FROM pg_tables
    WHERE schemaname = 'public';
    
    INSERT INTO performance_stats (metric_name, metric_value, metric_unit, metadata)
    VALUES 
        ('database_table_count', table_count, 'count', NULL),
        ('database_index_count', index_count, 'count', NULL),
        ('database_total_size', total_size, 'bytes', NULL);
    
    -- キャッシュヒット率
    WITH cache_stats AS (
        SELECT 
            sum(heap_blks_read) as heap_read,
            sum(heap_blks_hit) as heap_hit,
            sum(idx_blks_read) as idx_read,
            sum(idx_blks_hit) as idx_hit
        FROM pg_statio_user_tables
    )
    INSERT INTO performance_stats (metric_name, metric_value, metric_unit, metadata)
    SELECT 
        'cache_hit_ratio',
        CASE 
            WHEN (heap_hit + heap_read) > 0 THEN
                round(100.0 * heap_hit / (heap_hit + heap_read), 2)
            ELSE 0
        END,
        'percent',
        jsonb_build_object(
            'heap_hit', heap_hit,
            'heap_read', heap_read,
            'idx_hit', idx_hit,
            'idx_read', idx_read
        )
    FROM cache_stats;
    
    -- 古い統計データのクリーンアップ（30日以上前）
    DELETE FROM performance_stats 
    WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- クエリパフォーマンス分析関数
-- ========================================
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE (
    query_type TEXT,
    avg_execution_time_ms DECIMAL(10,2),
    max_execution_time_ms DECIMAL(10,2),
    total_calls BIGINT,
    total_time_ms DECIMAL(15,2),
    performance_rating TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH query_patterns AS (
        SELECT 
            CASE 
                WHEN query ILIKE '%FROM properties%' THEN 'property_queries'
                WHEN query ILIKE '%FROM rent_rolls%' THEN 'rent_roll_queries'
                WHEN query ILIKE '%FROM expenses%' THEN 'expense_queries'
                WHEN query ILIKE '%FROM loans%' THEN 'loan_queries'
                WHEN query ILIKE '%FROM property_monthly_summaries%' THEN 'summary_queries'
                WHEN query ILIKE '%INSERT%' THEN 'insert_operations'
                WHEN query ILIKE '%UPDATE%' THEN 'update_operations'
                WHEN query ILIKE '%DELETE%' THEN 'delete_operations'
                ELSE 'other_queries'
            END as query_type,
            mean_exec_time,
            max_exec_time,
            calls,
            total_exec_time
        FROM pg_stat_statements
        WHERE query NOT ILIKE '%pg_%'
        AND query NOT ILIKE '%information_schema%'
    ),
    aggregated AS (
        SELECT 
            qp.query_type,
            ROUND(AVG(qp.mean_exec_time)::NUMERIC, 2) as avg_time,
            ROUND(MAX(qp.max_exec_time)::NUMERIC, 2) as max_time,
            SUM(qp.calls) as total_calls,
            ROUND(SUM(qp.total_exec_time)::NUMERIC, 2) as total_time
        FROM query_patterns qp
        GROUP BY qp.query_type
    )
    SELECT 
        a.query_type,
        a.avg_time as avg_execution_time_ms,
        a.max_time as max_execution_time_ms,
        a.total_calls,
        a.total_time as total_time_ms,
        CASE 
            WHEN a.avg_time < 10 THEN 'EXCELLENT'
            WHEN a.avg_time < 50 THEN 'GOOD'
            WHEN a.avg_time < 200 THEN 'ACCEPTABLE'
            WHEN a.avg_time < 1000 THEN 'NEEDS_OPTIMIZATION'
            ELSE 'CRITICAL'
        END as performance_rating
    FROM aggregated a
    ORDER BY a.total_time DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- リアルタイム監視ダッシュボード用ビュー
-- ========================================

-- システムヘルススコアビュー
CREATE OR REPLACE VIEW v_system_health AS
WITH health_metrics AS (
    SELECT 
        -- エラー率
        (SELECT COUNT(*) FROM error_logs WHERE occurred_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') as recent_errors,
        -- 失敗テスト
        (SELECT COUNT(*) FROM test_results WHERE status = 'failed' AND executed_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as failed_tests,
        -- キャッシュヒット率
        (SELECT metric_value FROM performance_stats WHERE metric_name = 'cache_hit_ratio' ORDER BY recorded_at DESC LIMIT 1) as cache_hit_ratio,
        -- 平均クエリ時間
        (SELECT AVG(mean_exec_time) FROM pg_stat_statements WHERE query NOT ILIKE '%pg_%') as avg_query_time
)
SELECT 
    CASE 
        WHEN recent_errors > 100 OR failed_tests > 5 THEN 'CRITICAL'
        WHEN recent_errors > 50 OR failed_tests > 2 THEN 'WARNING'
        WHEN recent_errors > 10 OR failed_tests > 0 THEN 'ATTENTION'
        ELSE 'HEALTHY'
    END as health_status,
    recent_errors,
    failed_tests,
    COALESCE(cache_hit_ratio, 0) as cache_hit_ratio,
    ROUND(COALESCE(avg_query_time, 0)::NUMERIC, 2) as avg_query_time_ms,
    jsonb_build_object(
        'error_score', LEAST(100, recent_errors),
        'test_score', CASE WHEN failed_tests = 0 THEN 100 ELSE GREATEST(0, 100 - failed_tests * 20) END,
        'cache_score', COALESCE(cache_hit_ratio, 0),
        'performance_score', CASE 
            WHEN avg_query_time < 10 THEN 100
            WHEN avg_query_time < 50 THEN 80
            WHEN avg_query_time < 200 THEN 60
            WHEN avg_query_time < 1000 THEN 40
            ELSE 20
        END
    ) as health_scores,
    CURRENT_TIMESTAMP as checked_at
FROM health_metrics;

-- アクティブユーザー統計ビュー
CREATE OR REPLACE VIEW v_active_user_stats AS
WITH user_activity AS (
    SELECT 
        u.id,
        u.email,
        u.role,
        COUNT(DISTINCT p.id) as property_count,
        MAX(p.created_at) as last_property_created,
        (SELECT MAX(occurred_at) FROM error_logs WHERE user_id = u.id) as last_error,
        (SELECT COUNT(*) FROM access_logs WHERE user_id = u.id AND accessed_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as recent_access_count
    FROM users u
    LEFT JOIN properties p ON u.id = p.user_id AND p.deleted_at IS NULL
    WHERE u.deleted_at IS NULL
    GROUP BY u.id, u.email, u.role
)
SELECT 
    id,
    email,
    role,
    property_count,
    last_property_created,
    last_error,
    recent_access_count,
    CASE 
        WHEN recent_access_count > 100 THEN 'VERY_ACTIVE'
        WHEN recent_access_count > 50 THEN 'ACTIVE'
        WHEN recent_access_count > 10 THEN 'MODERATE'
        WHEN recent_access_count > 0 THEN 'LOW'
        ELSE 'INACTIVE'
    END as activity_level
FROM user_activity
ORDER BY recent_access_count DESC;

-- テーブル成長統計ビュー
CREATE OR REPLACE VIEW v_table_growth_stats AS
WITH current_stats AS (
    SELECT 
        tablename,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
),
historical_stats AS (
    SELECT 
        REPLACE(metric_name, 'table_size_', '') as tablename,
        metric_value as size_bytes,
        recorded_at
    FROM performance_stats
    WHERE metric_name LIKE 'table_size_%'
    AND recorded_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
)
SELECT 
    cs.tablename,
    cs.row_count,
    cs.table_size as current_size,
    COALESCE(
        ROUND(
            100.0 * (cs.size_bytes - MIN(hs.size_bytes)) / NULLIF(MIN(hs.size_bytes), 0), 
            2
        ), 
        0
    ) as growth_percent_7d,
    CASE 
        WHEN cs.row_count > 1000000 THEN 'LARGE'
        WHEN cs.row_count > 100000 THEN 'MEDIUM'
        WHEN cs.row_count > 10000 THEN 'SMALL'
        ELSE 'TINY'
    END as table_category
FROM current_stats cs
LEFT JOIN historical_stats hs ON cs.tablename = hs.tablename
GROUP BY cs.tablename, cs.row_count, cs.table_size, cs.size_bytes
ORDER BY cs.size_bytes DESC;

-- ========================================
-- 監視アラート関数
-- ========================================
CREATE OR REPLACE FUNCTION check_system_alerts()
RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- エラー率アラート
    IF (SELECT COUNT(*) FROM error_logs WHERE occurred_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') > 100 THEN
        RETURN QUERY
        SELECT 
            'HIGH_ERROR_RATE'::TEXT,
            'CRITICAL'::TEXT,
            'Error rate exceeded threshold: >100 errors in last hour'::TEXT,
            jsonb_build_object(
                'error_count', (SELECT COUNT(*) FROM error_logs WHERE occurred_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'),
                'threshold', 100
            );
    END IF;
    
    -- ストレージアラート
    IF (SELECT SUM(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public') > 10737418240 THEN -- 10GB
        RETURN QUERY
        SELECT 
            'HIGH_STORAGE_USAGE'::TEXT,
            'WARNING'::TEXT,
            'Database size exceeded 10GB'::TEXT,
            jsonb_build_object(
                'current_size_gb', ROUND((SELECT SUM(pg_total_relation_size(schemaname||'.'||tablename))::NUMERIC / 1073741824 FROM pg_tables WHERE schemaname = 'public'), 2),
                'threshold_gb', 10
            );
    END IF;
    
    -- パフォーマンスアラート
    IF (SELECT AVG(mean_exec_time) FROM pg_stat_statements WHERE query NOT ILIKE '%pg_%' LIMIT 100) > 500 THEN
        RETURN QUERY
        SELECT 
            'SLOW_QUERIES'::TEXT,
            'WARNING'::TEXT,
            'Average query time exceeded 500ms'::TEXT,
            jsonb_build_object(
                'avg_query_time_ms', ROUND((SELECT AVG(mean_exec_time) FROM pg_stat_statements WHERE query NOT ILIKE '%pg_%' LIMIT 100)::NUMERIC, 2),
                'threshold_ms', 500
            );
    END IF;
    
    -- インデックス未使用アラート
    IF EXISTS (
        SELECT 1 FROM pg_stat_user_indexes 
        WHERE schemaname = 'public' 
        AND idx_scan = 0 
        AND indexrelname NOT LIKE '%pkey%'
    ) THEN
        RETURN QUERY
        SELECT 
            'UNUSED_INDEXES'::TEXT,
            'INFO'::TEXT,
            'Unused indexes detected'::TEXT,
            jsonb_build_object(
                'unused_indexes', (
                    SELECT jsonb_agg(indexrelname) 
                    FROM pg_stat_user_indexes 
                    WHERE schemaname = 'public' 
                    AND idx_scan = 0 
                    AND indexrelname NOT LIKE '%pkey%'
                )
            );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 定期メンテナンス用関数
-- ========================================
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS TABLE (
    task_name TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    vacuum_result TEXT;
    analyze_result TEXT;
    cleanup_count INTEGER;
BEGIN
    -- VACUUM ANALYZE実行
    BEGIN
        VACUUM ANALYZE;
        RETURN QUERY SELECT 'VACUUM_ANALYZE'::TEXT, 'SUCCESS'::TEXT, 'Database vacuumed and analyzed'::TEXT;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT 'VACUUM_ANALYZE'::TEXT, 'FAILED'::TEXT, SQLERRM::TEXT;
    END;
    
    -- 古いログデータのクリーンアップ
    DELETE FROM error_logs WHERE occurred_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN QUERY SELECT 'CLEANUP_ERROR_LOGS'::TEXT, 'SUCCESS'::TEXT, format('Deleted %s old error logs', cleanup_count)::TEXT;
    
    DELETE FROM performance_stats WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN QUERY SELECT 'CLEANUP_PERFORMANCE_STATS'::TEXT, 'SUCCESS'::TEXT, format('Deleted %s old performance stats', cleanup_count)::TEXT;
    
    DELETE FROM test_results WHERE executed_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN QUERY SELECT 'CLEANUP_TEST_RESULTS'::TEXT, 'SUCCESS'::TEXT, format('Deleted %s old test results', cleanup_count)::TEXT;
    
    -- 統計情報の更新
    BEGIN
        PERFORM collect_system_stats();
        RETURN QUERY SELECT 'UPDATE_STATISTICS'::TEXT, 'SUCCESS'::TEXT, 'System statistics updated'::TEXT;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT 'UPDATE_STATISTICS'::TEXT, 'FAILED'::TEXT, SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- パフォーマンス統計のRLSポリシー
-- ========================================
ALTER TABLE performance_stats ENABLE ROW LEVEL SECURITY;

-- 管理者のみ参照可能
CREATE POLICY performance_stats_admin_only ON performance_stats
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- コメント追加
COMMENT ON FUNCTION collect_system_stats IS 'システム統計情報を収集して記録';
COMMENT ON FUNCTION analyze_query_performance IS 'クエリパフォーマンスを分析してレポート生成';
COMMENT ON VIEW v_system_health IS 'システムヘルス状態の総合ダッシュボード';
COMMENT ON VIEW v_active_user_stats IS 'アクティブユーザーの活動統計';
COMMENT ON VIEW v_table_growth_stats IS 'テーブル成長率の監視ビュー';
COMMENT ON FUNCTION check_system_alerts IS 'システムアラートのチェックと生成';
COMMENT ON FUNCTION perform_maintenance IS 'データベースメンテナンスタスクの実行';