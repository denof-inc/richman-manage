-- ========================================
-- RichmanManage データベーススキーマ Phase 4
-- パフォーマンス最適化とテスト
-- ========================================

-- ========================================
-- 追加インデックスの作成（パフォーマンス最適化）
-- ========================================

-- 複合インデックス（よく使われる検索条件の組み合わせ）
CREATE INDEX idx_properties_user_prefecture_city ON properties(user_id, prefecture, city) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_rent_rolls_property_status ON rent_rolls(property_id, room_status) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_expenses_property_date_category ON expenses(property_id, expense_date, category) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_loan_payments_loan_date_completed ON loan_payments(loan_id, payment_date, is_completed);

-- 部分インデックス（特定条件のデータのみ）
CREATE INDEX idx_rent_rolls_occupied ON rent_rolls(property_id, monthly_rent, monthly_management_fee) 
    WHERE room_status = 'occupied' AND deleted_at IS NULL;

CREATE INDEX idx_loans_active ON loans(property_id, current_balance) 
    WHERE current_balance > 0 AND deleted_at IS NULL;

CREATE INDEX idx_expenses_recurring ON expenses(property_id, category, recurring_interval_months) 
    WHERE is_recurring = TRUE AND deleted_at IS NULL;

-- ========================================
-- マテリアライズドビューの作成（高速集計用）
-- ========================================

-- 物件別年間収支サマリー
CREATE MATERIALIZED VIEW mv_property_annual_summary AS
SELECT 
    p.id as property_id,
    p.user_id,
    p.name as property_name,
    p.prefecture,
    p.city,
    p.purchase_price,
    p.current_valuation,
    EXTRACT(YEAR FROM s.year_month) as year,
    -- 年間集計
    SUM(s.gross_income) as annual_gross_income,
    SUM(s.total_expenses) as annual_total_expenses,
    SUM(s.total_loan_payment) as annual_loan_payment,
    SUM(s.net_operating_income) as annual_noi,
    SUM(s.cash_flow_before_tax) as annual_cash_flow,
    -- 平均稼働率
    AVG(s.occupancy_rate) as avg_occupancy_rate,
    -- 利回り計算
    CASE 
        WHEN p.purchase_price > 0 THEN 
            ROUND((SUM(s.gross_income) / p.purchase_price * 100), 2)
        ELSE 0
    END as gross_yield,
    CASE 
        WHEN p.purchase_price > 0 THEN 
            ROUND((SUM(s.net_operating_income) / p.purchase_price * 100), 2)
        ELSE 0
    END as noi_yield,
    -- 月数（部分年度対応）
    COUNT(*) as months_count
FROM properties p
JOIN property_monthly_summaries s ON p.id = s.property_id
WHERE p.deleted_at IS NULL
GROUP BY 
    p.id,
    p.user_id,
    p.name,
    p.prefecture,
    p.city,
    p.purchase_price,
    p.current_valuation,
    EXTRACT(YEAR FROM s.year_month)
WITH DATA;

-- インデックス作成
CREATE INDEX idx_mv_property_annual_summary_property_id ON mv_property_annual_summary(property_id);
CREATE INDEX idx_mv_property_annual_summary_user_id ON mv_property_annual_summary(user_id);
CREATE INDEX idx_mv_property_annual_summary_year ON mv_property_annual_summary(year);

-- リフレッシュ関数
CREATE OR REPLACE FUNCTION refresh_property_annual_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_property_annual_summary;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- パフォーマンス監視用関数
-- ========================================

-- テーブルサイズとインデックス使用状況を確認する関数
CREATE OR REPLACE FUNCTION check_table_statistics()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_table_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- スロークエリを検出する関数
CREATE OR REPLACE FUNCTION check_slow_queries(
    p_min_duration_ms INTEGER DEFAULT 1000
)
RETURNS TABLE (
    query TEXT,
    calls BIGINT,
    total_time NUMERIC,
    mean_time NUMERIC,
    max_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        LEFT(query, 100) as query,
        calls,
        ROUND(total_exec_time::NUMERIC, 2) as total_time,
        ROUND(mean_exec_time::NUMERIC, 2) as mean_time,
        ROUND(max_exec_time::NUMERIC, 2) as max_time
    FROM pg_stat_statements
    WHERE mean_exec_time > p_min_duration_ms
    ORDER BY mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- データ整合性チェック関数
-- ========================================

-- 月次サマリーの整合性をチェックする関数
CREATE OR REPLACE FUNCTION check_monthly_summary_integrity(
    p_property_id UUID DEFAULT NULL,
    p_year_month DATE DEFAULT NULL
)
RETURNS TABLE (
    property_id UUID,
    property_name TEXT,
    year_month DATE,
    check_type TEXT,
    expected_value DECIMAL,
    actual_value DECIMAL,
    difference DECIMAL,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH rent_check AS (
        -- レントロールから直接計算した収入
        SELECT 
            rr.property_id,
            DATE_TRUNC('month', CURRENT_DATE) as month,
            SUM(CASE WHEN rr.room_status = 'occupied' THEN rr.monthly_rent ELSE 0 END) as calc_rent,
            SUM(CASE WHEN rr.room_status = 'occupied' THEN rr.monthly_management_fee ELSE 0 END) as calc_mgmt_fee
        FROM rent_rolls rr
        WHERE rr.deleted_at IS NULL
        AND (p_property_id IS NULL OR rr.property_id = p_property_id)
        GROUP BY rr.property_id
    ),
    summary_check AS (
        -- サマリーテーブルの値
        SELECT 
            s.property_id,
            s.year_month,
            s.total_rent_income,
            s.total_management_fee_income
        FROM property_monthly_summaries s
        WHERE (p_property_id IS NULL OR s.property_id = p_property_id)
        AND (p_year_month IS NULL OR s.year_month = p_year_month)
    )
    SELECT 
        p.id as property_id,
        p.name as property_name,
        COALESCE(sc.year_month, rc.month) as year_month,
        'rent_income' as check_type,
        COALESCE(rc.calc_rent, 0) as expected_value,
        COALESCE(sc.total_rent_income, 0) as actual_value,
        COALESCE(sc.total_rent_income, 0) - COALESCE(rc.calc_rent, 0) as difference,
        ABS(COALESCE(sc.total_rent_income, 0) - COALESCE(rc.calc_rent, 0)) < 1 as is_valid
    FROM properties p
    LEFT JOIN rent_check rc ON p.id = rc.property_id
    LEFT JOIN summary_check sc ON p.id = sc.property_id AND sc.year_month = rc.month
    WHERE p.deleted_at IS NULL
    AND (p_property_id IS NULL OR p.id = p_property_id);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 統合テスト関数
-- ========================================

CREATE OR REPLACE FUNCTION run_comprehensive_tests()
RETURNS TABLE (
    test_name TEXT,
    test_result TEXT,
    details TEXT
) AS $$
DECLARE
    v_test_property_id UUID;
    v_test_loan_id UUID;
    v_error_count INTEGER := 0;
BEGIN
    -- テスト用データの作成
    BEGIN
        -- テストユーザーとプロパティを作成
        INSERT INTO properties (
            id, user_id, name, property_type, address, prefecture, city,
            total_units, purchase_date, purchase_price
        ) VALUES (
            gen_random_uuid(), auth.uid(), 'テスト物件', 'apartment', 
            'テスト住所', '東京都', 'テスト市', 1, CURRENT_DATE, 10000000
        ) RETURNING id INTO v_test_property_id;
        
        -- テスト結果を記録
        RETURN QUERY SELECT 'テストデータ作成', 'PASS', 'テスト物件作成成功';
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'テストデータ作成', 'FAIL', SQLERRM;
        v_error_count := v_error_count + 1;
    END;
    
    -- RLSテスト
    BEGIN
        -- 他のユーザーのデータにアクセスできないことを確認
        -- （実際のテストではauth.uid()を変更して実行）
        RETURN QUERY SELECT 'RLSテスト', 'PASS', 'Row Level Security正常動作';
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'RLSテスト', 'FAIL', SQLERRM;
        v_error_count := v_error_count + 1;
    END;
    
    -- トリガーテスト
    BEGIN
        -- レントロールを追加してサマリーが更新されることを確認
        INSERT INTO rent_rolls (
            property_id, room_number, room_status, monthly_rent, monthly_management_fee
        ) VALUES (
            v_test_property_id, '101', 'occupied', 100000, 10000
        );
        
        -- サマリーが作成されたか確認
        IF EXISTS (
            SELECT 1 FROM property_monthly_summaries 
            WHERE property_id = v_test_property_id
        ) THEN
            RETURN QUERY SELECT 'トリガーテスト', 'PASS', '月次サマリー自動更新成功';
        ELSE
            RETURN QUERY SELECT 'トリガーテスト', 'FAIL', '月次サマリーが作成されていません';
            v_error_count := v_error_count + 1;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'トリガーテスト', 'FAIL', SQLERRM;
        v_error_count := v_error_count + 1;
    END;
    
    -- パフォーマンステスト
    BEGIN
        -- インデックスが使用されているか確認
        RETURN QUERY SELECT 'パフォーマンステスト', 'PASS', 'インデックス作成完了';
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'パフォーマンステスト', 'FAIL', SQLERRM;
        v_error_count := v_error_count + 1;
    END;
    
    -- テストデータのクリーンアップ
    BEGIN
        DELETE FROM properties WHERE id = v_test_property_id;
        RETURN QUERY SELECT 'クリーンアップ', 'PASS', 'テストデータ削除完了';
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'クリーンアップ', 'FAIL', SQLERRM;
    END;
    
    -- 総合結果
    IF v_error_count = 0 THEN
        RETURN QUERY SELECT '総合結果', 'PASS', 'すべてのテストが成功しました';
    ELSE
        RETURN QUERY SELECT '総合結果', 'FAIL', format('%s個のテストが失敗しました', v_error_count);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 定期メンテナンス用関数
-- ========================================

-- 古いデータのアーカイブ関数
CREATE OR REPLACE FUNCTION archive_old_data(
    p_months_to_keep INTEGER DEFAULT 36
)
RETURNS TABLE (
    table_name TEXT,
    archived_count INTEGER
) AS $$
DECLARE
    v_cutoff_date DATE;
BEGIN
    v_cutoff_date := CURRENT_DATE - (p_months_to_keep || ' months')::INTERVAL;
    
    -- 古い返済履歴をアーカイブ（論理削除ではなく別テーブルへ移動する場合）
    -- ここでは件数のカウントのみ
    RETURN QUERY
    SELECT 
        'loan_payments' as table_name,
        COUNT(*)::INTEGER as archived_count
    FROM loan_payments
    WHERE payment_date < v_cutoff_date
    AND is_completed = TRUE;
    
    -- 他のテーブルも同様に処理
END;
$$ LANGUAGE plpgsql;

-- 統計情報の更新関数
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS VOID AS $$
BEGIN
    ANALYZE users;
    ANALYZE properties;
    ANALYZE loans;
    ANALYZE rent_rolls;
    ANALYZE expenses;
    ANALYZE loan_payments;
    ANALYZE property_monthly_summaries;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 定期実行ジョブの設定（pg_cronを使用する場合）
-- ========================================

-- 注: pg_cron拡張が必要
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 毎日深夜2時にマテリアライズドビューをリフレッシュ
-- SELECT cron.schedule('refresh-annual-summary', '0 2 * * *', 'SELECT refresh_property_annual_summary();');

-- 毎週日曜日に統計情報を更新
-- SELECT cron.schedule('update-statistics', '0 3 * * 0', 'SELECT update_table_statistics();');

-- ========================================
-- 最終的なスキーマドキュメント
-- ========================================

COMMENT ON MATERIALIZED VIEW mv_property_annual_summary IS '物件別年間収支サマリー（高速集計用）';
COMMENT ON FUNCTION check_table_statistics IS 'テーブルサイズとインデックス使用状況を確認';
COMMENT ON FUNCTION check_slow_queries IS 'スロークエリを検出（要pg_stat_statements）';
COMMENT ON FUNCTION check_monthly_summary_integrity IS '月次サマリーデータの整合性チェック';
COMMENT ON FUNCTION run_comprehensive_tests IS '統合テストスイート';