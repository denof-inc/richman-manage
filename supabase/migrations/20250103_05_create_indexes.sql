-- ========================================
-- RichmanManage データベーススキーマ修正
-- Phase 2.2: インデックス戦略の実装
-- パフォーマンス最適化のための包括的インデックス設計
-- ========================================

-- ========================================
-- 既存のインデックスを整理（重複を避ける）
-- ========================================

-- 既存のインデックスを確認してから削除
DO $$ 
BEGIN
    -- propertiesテーブルの既存インデックスを削除
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_user_id') THEN
        DROP INDEX idx_properties_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_created_at') THEN
        DROP INDEX idx_properties_created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_purchase_date') THEN
        DROP INDEX idx_properties_purchase_date;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_prefecture_city') THEN
        DROP INDEX idx_properties_prefecture_city;
    END IF;
    
    -- その他のテーブルの既存インデックスも同様に処理
END $$;

-- ========================================
-- propertiesテーブルのインデックス
-- ========================================

-- アクティブな物件のユーザー別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_user_id_active 
ON properties(user_id) 
WHERE deleted_at IS NULL;

-- 地域別検索用（複合インデックス）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_user_prefecture_city 
ON properties(user_id, prefecture, city) 
WHERE deleted_at IS NULL;

-- 購入日での検索・ソート用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_purchase_date 
ON properties(purchase_date) 
WHERE deleted_at IS NULL;

-- 物件タイプ別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_type_user
ON properties(property_type, user_id)
WHERE deleted_at IS NULL;

-- 包括的検索用インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_search 
ON properties(user_id, property_type, prefecture, city) 
WHERE deleted_at IS NULL;

-- ========================================
-- rent_rollsテーブルのインデックス
-- ========================================

-- 物件別のアクティブなレントロール検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_rolls_property_id_active 
ON rent_rolls(property_id) 
WHERE deleted_at IS NULL;

-- 物件別・ステータス別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_rolls_property_status 
ON rent_rolls(property_id, room_status) 
WHERE deleted_at IS NULL;

-- 入居中の部屋の収入集計用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_rolls_occupied_income 
ON rent_rolls(property_id, monthly_rent, monthly_management_fee) 
WHERE room_status = 'occupied' AND deleted_at IS NULL;

-- リース期間での検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_rolls_lease_dates 
ON rent_rolls(property_id, lease_start_date, lease_end_date) 
WHERE deleted_at IS NULL;

-- 月次収入サマリー用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_rolls_summary 
ON rent_rolls(property_id, room_status, monthly_rent) 
WHERE deleted_at IS NULL;

-- ========================================
-- loansテーブルのインデックス
-- ========================================

-- 物件別のアクティブな借入検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_property_id_active 
ON loans(property_id) 
WHERE deleted_at IS NULL;

-- アクティブな借入（残高がある）検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_active_balance 
ON loans(property_id, current_balance) 
WHERE current_balance > 0 AND deleted_at IS NULL;

-- 返済期日での検索・ソート用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_payment_dates 
ON loans(first_payment_date, final_payment_date) 
WHERE deleted_at IS NULL;

-- 金融機関別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_lender_name 
ON loans(lender_name, property_id) 
WHERE deleted_at IS NULL;

-- 金利タイプ別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_interest_type
ON loans(interest_type, property_id)
WHERE deleted_at IS NULL;

-- ========================================
-- expensesテーブルのインデックス
-- ========================================

-- 物件別・日付別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_property_date 
ON expenses(property_id, expense_date) 
WHERE deleted_at IS NULL;

-- 物件別・カテゴリ別・日付別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_property_category_date 
ON expenses(property_id, category, expense_date) 
WHERE deleted_at IS NULL;

-- 定期支出の検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_recurring 
ON expenses(property_id, category, recurring_interval_months) 
WHERE is_recurring = TRUE AND deleted_at IS NULL;

-- 月次集計用（関数インデックス）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_monthly_summary 
ON expenses(property_id, DATE_TRUNC('month', expense_date), category) 
WHERE deleted_at IS NULL;

-- ========================================
-- loan_paymentsテーブルのインデックス
-- ========================================

-- 借入別・日付別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_payments_loan_date 
ON loan_payments(loan_id, payment_date);

-- 日付範囲での検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_payments_date_range 
ON loan_payments(payment_date, loan_id);

-- 完了状態別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_payments_completion_status
ON loan_payments(loan_id, is_completed, payment_date);

-- 予定された支払いの検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_payments_scheduled
ON loan_payments(is_scheduled, is_completed, payment_date)
WHERE is_scheduled = TRUE;

-- ========================================
-- property_monthly_summariesテーブルのインデックス
-- ========================================

-- 物件別・月別検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_monthly_summaries_property_month 
ON property_monthly_summaries(property_id, year_month);

-- 月別集計用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_monthly_summaries_year_month 
ON property_monthly_summaries(year_month);

-- キャッシュフロー分析用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_monthly_summaries_cash_flow
ON property_monthly_summaries(property_id, year_month, cash_flow_before_tax);

-- ========================================
-- usersテーブルのインデックス（最適化）
-- ========================================

-- ロール別検索用（既存のインデックスがなければ作成）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active
ON users(role)
WHERE deleted_at IS NULL;

-- ========================================
-- monthly_summary_update_queueテーブルのインデックス（最適化）
-- ========================================

-- 処理順序の最適化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summary_queue_processing_order
ON monthly_summary_update_queue(processed_at NULLS FIRST, created_at)
WHERE processed_at IS NULL;

-- ========================================
-- パーティションインデックスの検討（将来の拡張用）
-- ========================================

-- 大量データに対応するための準備
COMMENT ON INDEX idx_expenses_monthly_summary IS '月次集計用の関数インデックス。将来的にパーティション化を検討';
COMMENT ON INDEX idx_loan_payments_date_range IS '日付範囲検索用。大量データ時はパーティション化を検討';

-- ========================================
-- マテリアライズドビューのインデックス更新
-- ========================================

-- 既存のマテリアライズドビューが存在する場合
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_property_annual_summary') THEN
        -- ユニークインデックスを作成（同時リフレッシュ用）
        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_property_annual_summary_unique
        ON mv_property_annual_summary(property_id, year);
        
        -- 検索用インデックス
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_property_annual_summary_user_year
        ON mv_property_annual_summary(user_id, year);
    END IF;
END $$;

-- ========================================
-- インデックス使用状況の監視用ビュー
-- ========================================
CREATE OR REPLACE VIEW v_index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'RARELY_USED'
        WHEN idx_scan < 1000 THEN 'MODERATELY_USED'
        ELSE 'FREQUENTLY_USED'
    END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ========================================
-- インデックスメンテナンス用関数
-- ========================================
CREATE OR REPLACE FUNCTION analyze_index_bloat()
RETURNS TABLE (
    tablename TEXT,
    indexname TEXT,
    index_size TEXT,
    bloat_ratio NUMERIC,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH index_bloat AS (
        SELECT 
            schemaname,
            tablename,
            indexname,
            pg_relation_size(indexrelid) as actual_size,
            CASE 
                WHEN pg_relation_size(indexrelid) > 0 THEN
                    round(100.0 * pg_stat_get_dead_tuples(indexrelid) / 
                          GREATEST(pg_stat_get_live_tuples(indexrelid) + pg_stat_get_dead_tuples(indexrelid), 1), 2)
                ELSE 0
            END as bloat_percentage
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
    )
    SELECT 
        ib.tablename::TEXT,
        ib.indexname::TEXT,
        pg_size_pretty(ib.actual_size)::TEXT as index_size,
        ib.bloat_percentage,
        CASE 
            WHEN ib.bloat_percentage > 50 THEN 'REINDEX RECOMMENDED'
            WHEN ib.bloat_percentage > 20 THEN 'MONITOR CLOSELY'
            ELSE 'HEALTHY'
        END::TEXT as recommendation
    FROM index_bloat ib
    WHERE ib.bloat_percentage > 10
    ORDER BY ib.bloat_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- コメント追加
COMMENT ON VIEW v_index_usage_stats IS 'インデックス使用状況の監視ビュー';
COMMENT ON FUNCTION analyze_index_bloat IS 'インデックスの肥大化を分析し、メンテナンスの推奨事項を提供';