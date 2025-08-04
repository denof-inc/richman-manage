-- ========================================
-- RichmanManage データベーススキーマ修正
-- Phase 2.3: エラーハンドリングの実装
-- 包括的なエラー管理とロギング機能
-- ========================================

-- ========================================
-- エラーログテーブルの作成
-- ========================================
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_detail JSONB,
    function_name TEXT,
    user_id UUID REFERENCES users(id),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
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

-- コメント追加
COMMENT ON TABLE error_logs IS 'システムエラーログテーブル';
COMMENT ON COLUMN error_logs.error_type IS 'エラータイプ（validation_error, business_logic_error, database_error, security_error, performance_error）';
COMMENT ON COLUMN error_logs.error_detail IS 'エラーの詳細情報（JSON形式）';
COMMENT ON COLUMN error_logs.function_name IS 'エラーが発生した関数名';

-- ========================================
-- エラーハンドリング関数の実装
-- ========================================

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

-- ========================================
-- データ検証関数
-- ========================================

-- 物件データ検証関数
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
    
    IF NOT (property_data ? 'property_type') THEN
        validation_errors := array_append(validation_errors, 'Property type is required');
    END IF;
    
    IF NOT (property_data ? 'prefecture') OR (property_data->>'prefecture') = '' THEN
        validation_errors := array_append(validation_errors, 'Prefecture is required');
    END IF;
    
    IF NOT (property_data ? 'city') OR (property_data->>'city') = '' THEN
        validation_errors := array_append(validation_errors, 'City is required');
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

-- 借入データ検証関数
CREATE OR REPLACE FUNCTION validate_loan_data(loan_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    validation_errors TEXT[] := ARRAY[]::TEXT[];
    principal_amount DECIMAL;
    interest_rate DECIMAL;
    term_months INTEGER;
BEGIN
    -- 必須フィールドの検証
    IF NOT (loan_data ? 'property_id') THEN
        validation_errors := array_append(validation_errors, 'Property ID is required');
    END IF;
    
    IF NOT (loan_data ? 'loan_name') OR (loan_data->>'loan_name') = '' THEN
        validation_errors := array_append(validation_errors, 'Loan name is required');
    END IF;
    
    IF NOT (loan_data ? 'lender_name') OR (loan_data->>'lender_name') = '' THEN
        validation_errors := array_append(validation_errors, 'Lender name is required');
    END IF;
    
    -- 金額の検証
    IF NOT (loan_data ? 'principal_amount') THEN
        validation_errors := array_append(validation_errors, 'Principal amount is required');
    ELSE
        principal_amount := (loan_data->>'principal_amount')::DECIMAL;
        IF principal_amount <= 0 THEN
            validation_errors := array_append(validation_errors, 'Principal amount must be positive');
        END IF;
    END IF;
    
    -- 金利の検証
    IF NOT (loan_data ? 'initial_interest_rate') THEN
        validation_errors := array_append(validation_errors, 'Interest rate is required');
    ELSE
        interest_rate := (loan_data->>'initial_interest_rate')::DECIMAL;
        IF interest_rate < 0 OR interest_rate > 100 THEN
            validation_errors := array_append(validation_errors, 'Interest rate must be between 0 and 100');
        END IF;
    END IF;
    
    -- 期間の検証
    IF NOT (loan_data ? 'loan_term_months') THEN
        validation_errors := array_append(validation_errors, 'Loan term is required');
    ELSE
        term_months := (loan_data->>'loan_term_months')::INTEGER;
        IF term_months <= 0 THEN
            validation_errors := array_append(validation_errors, 'Loan term must be positive');
        END IF;
    END IF;
    
    -- エラーがある場合はログに記録
    IF array_length(validation_errors, 1) > 0 THEN
        PERFORM log_error(
            'validation_error',
            'Loan data validation failed',
            jsonb_build_object(
                'errors', validation_errors,
                'data', loan_data
            ),
            'validate_loan_data'
        );
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ビジネスロジックエラーハンドリング
-- ========================================

-- 物件削除前のチェック関数（改善版）
CREATE OR REPLACE FUNCTION check_property_deletion_allowed(p_property_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    active_loans_count INTEGER;
    occupied_rooms_count INTEGER;
    unpaid_expenses_count INTEGER;
    error_details JSONB;
BEGIN
    -- アクティブな借入のチェック
    SELECT COUNT(*) INTO active_loans_count
    FROM loans
    WHERE property_id = p_property_id
    AND deleted_at IS NULL
    AND current_balance > 0;
    
    -- 入居中の部屋のチェック
    SELECT COUNT(*) INTO occupied_rooms_count
    FROM rent_rolls
    WHERE property_id = p_property_id
    AND deleted_at IS NULL
    AND room_status = 'occupied';
    
    -- 未処理の支出のチェック
    SELECT COUNT(*) INTO unpaid_expenses_count
    FROM expenses
    WHERE property_id = p_property_id
    AND deleted_at IS NULL
    AND expense_date > CURRENT_DATE - INTERVAL '30 days';
    
    -- エラーがある場合
    IF active_loans_count > 0 OR occupied_rooms_count > 0 OR unpaid_expenses_count > 0 THEN
        error_details := jsonb_build_object(
            'property_id', p_property_id,
            'active_loans', active_loans_count,
            'occupied_rooms', occupied_rooms_count,
            'recent_expenses', unpaid_expenses_count
        );
        
        PERFORM log_error(
            'business_logic_error',
            'Property cannot be deleted due to active dependencies',
            error_details,
            'check_property_deletion_allowed'
        );
        
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- パフォーマンス監視エラーハンドリング
-- ========================================

-- スロークエリ検出とログ記録
CREATE OR REPLACE FUNCTION log_slow_query(
    p_query_text TEXT,
    p_execution_time_ms INTEGER,
    p_affected_tables TEXT[]
)
RETURNS VOID AS $$
BEGIN
    IF p_execution_time_ms > 1000 THEN -- 1秒以上
        PERFORM log_error(
            'performance_error',
            format('Slow query detected: %sms', p_execution_time_ms),
            jsonb_build_object(
                'query', LEFT(p_query_text, 500),
                'execution_time_ms', p_execution_time_ms,
                'affected_tables', p_affected_tables,
                'timestamp', CURRENT_TIMESTAMP
            ),
            'log_slow_query'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- セキュリティエラーハンドリング
-- ========================================

-- 不正アクセス検出とログ記録
CREATE OR REPLACE FUNCTION log_security_violation(
    p_violation_type TEXT,
    p_details JSONB
)
RETURNS VOID AS $$
BEGIN
    PERFORM log_error(
        'security_error',
        format('Security violation detected: %s', p_violation_type),
        p_details,
        'log_security_violation'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- エラーハンドリング付きの改善された関数例
-- ========================================

-- 月次集計更新関数（エラーハンドリング追加版）
CREATE OR REPLACE FUNCTION refresh_monthly_summary_safe(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rent_income RECORD;
    v_expenses RECORD;
    v_loan_payments RECORD;
    v_error_id UUID;
BEGIN
    -- 入力検証
    IF p_property_id IS NULL OR p_year_month IS NULL THEN
        v_error_id := log_error(
            'validation_error',
            'Invalid input parameters for monthly summary refresh',
            jsonb_build_object(
                'property_id', p_property_id,
                'year_month', p_year_month
            ),
            'refresh_monthly_summary_safe'
        );
        RETURN FALSE;
    END IF;
    
    -- 物件の存在確認
    IF NOT EXISTS (
        SELECT 1 FROM properties 
        WHERE id = p_property_id AND deleted_at IS NULL
    ) THEN
        v_error_id := log_error(
            'business_logic_error',
            'Property not found or deleted',
            jsonb_build_object('property_id', p_property_id),
            'refresh_monthly_summary_safe'
        );
        RETURN FALSE;
    END IF;
    
    -- 月次集計の実行
    BEGIN
        PERFORM refresh_monthly_summary(p_property_id, p_year_month);
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_id := log_error(
                'database_error',
                'Failed to refresh monthly summary',
                jsonb_build_object(
                    'property_id', p_property_id,
                    'year_month', p_year_month,
                    'error', SQLERRM,
                    'error_detail', SQLSTATE
                ),
                'refresh_monthly_summary_safe'
            );
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- エラーログのRLSポリシー
-- ========================================

-- RLSを有効化
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 自分のエラーログのみ参照可能（管理者は全て参照可能）
CREATE POLICY error_logs_select_policy ON error_logs
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_admin()
    );

-- エラーログの挿入は内部関数経由のみ
CREATE POLICY error_logs_insert_policy ON error_logs
    FOR INSERT
    WITH CHECK (false);

-- ========================================
-- エラーサマリービュー
-- ========================================
CREATE OR REPLACE VIEW v_error_summary AS
WITH error_stats AS (
    SELECT 
        error_type,
        function_name,
        DATE_TRUNC('hour', occurred_at) as error_hour,
        COUNT(*) as error_count,
        COUNT(DISTINCT user_id) as affected_users
    FROM error_logs
    WHERE occurred_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY error_type, function_name, DATE_TRUNC('hour', occurred_at)
)
SELECT 
    error_type,
    function_name,
    error_hour,
    error_count,
    affected_users,
    CASE 
        WHEN error_count > 100 THEN 'CRITICAL'
        WHEN error_count > 50 THEN 'HIGH'
        WHEN error_count > 10 THEN 'MEDIUM'
        ELSE 'LOW'
    END as severity
FROM error_stats
ORDER BY error_count DESC;

-- コメント追加
COMMENT ON FUNCTION log_error IS 'エラーログ記録用の汎用関数';
COMMENT ON FUNCTION validate_property_data IS '物件データのバリデーション関数';
COMMENT ON FUNCTION validate_loan_data IS '借入データのバリデーション関数';
COMMENT ON VIEW v_error_summary IS '過去24時間のエラーサマリービュー';