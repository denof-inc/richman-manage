-- ========================================
-- RichmanManage データベーススキーマ修正
-- Phase 2.1: トリガー処理の最適化
-- バッチ処理対応とパフォーマンス最適化
-- ========================================

-- ========================================
-- 既存のトリガーを削除
-- ========================================
DROP TRIGGER IF EXISTS trigger_rent_roll_change ON rent_rolls;
DROP TRIGGER IF EXISTS trigger_expense_change ON expenses;
DROP TRIGGER IF EXISTS trigger_loan_payment_change ON loan_payments;
DROP FUNCTION IF EXISTS trigger_update_monthly_summary_on_rent_roll_change();
DROP FUNCTION IF EXISTS trigger_update_monthly_summary_on_expense_change();
DROP FUNCTION IF EXISTS trigger_update_monthly_summary_on_loan_payment_change();

-- ========================================
-- 月次集計更新キューテーブルの作成
-- ========================================
CREATE TABLE IF NOT EXISTS monthly_summary_update_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL,
    year_month DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    
    CONSTRAINT unique_property_month_queue UNIQUE (property_id, year_month),
    CONSTRAINT valid_property_id FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX idx_monthly_summary_update_queue_unprocessed 
ON monthly_summary_update_queue(created_at) 
WHERE processed_at IS NULL;

-- コメント追加
COMMENT ON TABLE monthly_summary_update_queue IS '月次集計更新キュー（バッチ処理用）';
COMMENT ON COLUMN monthly_summary_update_queue.property_id IS '対象物件ID';
COMMENT ON COLUMN monthly_summary_update_queue.year_month IS '対象年月（月初日で保存）';
COMMENT ON COLUMN monthly_summary_update_queue.processed_at IS '処理完了日時';

-- ========================================
-- 最適化されたトリガー関数（キューに追加のみ）
-- ========================================
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

-- ========================================
-- 新しいトリガー設定（軽量化）
-- ========================================
CREATE TRIGGER trigger_queue_monthly_summary_rent_rolls
    AFTER INSERT OR UPDATE OR DELETE ON rent_rolls
    FOR EACH ROW EXECUTE FUNCTION queue_monthly_summary_update();

CREATE TRIGGER trigger_queue_monthly_summary_expenses
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION queue_monthly_summary_update();

CREATE TRIGGER trigger_queue_monthly_summary_loan_payments
    AFTER INSERT OR UPDATE OR DELETE ON loan_payments
    FOR EACH ROW EXECUTE FUNCTION queue_monthly_summary_update();

-- ========================================
-- 月次集計の更新関数（既存の関数を最適化）
-- ========================================
CREATE OR REPLACE FUNCTION refresh_monthly_summary(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS VOID AS $$
DECLARE
    v_rent_income RECORD;
    v_expenses RECORD;
    v_loan_payments RECORD;
    v_gross_income DECIMAL(15,2);
    v_net_operating_income DECIMAL(15,2);
    v_cash_flow_before_tax DECIMAL(15,2);
BEGIN
    -- レントロール情報を取得
    SELECT * INTO v_rent_income 
    FROM calculate_monthly_rent_income(p_property_id, p_year_month);
    
    -- 支出情報を取得
    SELECT * INTO v_expenses
    FROM calculate_monthly_expenses(p_property_id, p_year_month);
    
    -- 借入返済情報を取得
    SELECT * INTO v_loan_payments
    FROM calculate_monthly_loan_payments(p_property_id, p_year_month);
    
    -- 総収入を計算
    v_gross_income := v_rent_income.total_rent + v_rent_income.total_management_fee;
    
    -- 営業純利益を計算
    v_net_operating_income := v_gross_income - v_expenses.total_expenses;
    
    -- 税引前キャッシュフローを計算
    v_cash_flow_before_tax := v_net_operating_income - v_loan_payments.total_loan_payment;
    
    -- サマリーテーブルを更新（UPSERT）
    INSERT INTO property_monthly_summaries (
        property_id,
        year_month,
        total_rent_income,
        total_management_fee_income,
        gross_income,
        expense_management_fee,
        expense_repair_cost,
        expense_tax,
        expense_insurance,
        expense_utilities,
        expense_cleaning,
        expense_other,
        total_expenses,
        loan_principal_payment,
        loan_interest_payment,
        total_loan_payment,
        net_operating_income,
        cash_flow_before_tax,
        total_rooms,
        occupied_rooms,
        occupancy_rate
    ) VALUES (
        p_property_id,
        p_year_month,
        v_rent_income.total_rent,
        v_rent_income.total_management_fee,
        v_gross_income,
        v_expenses.expense_management_fee,
        v_expenses.expense_repair_cost,
        v_expenses.expense_tax,
        v_expenses.expense_insurance,
        v_expenses.expense_utilities,
        v_expenses.expense_cleaning,
        v_expenses.expense_other,
        v_expenses.total_expenses,
        v_loan_payments.loan_principal_payment,
        v_loan_payments.loan_interest_payment,
        v_loan_payments.total_loan_payment,
        v_net_operating_income,
        v_cash_flow_before_tax,
        v_rent_income.total_rooms,
        v_rent_income.occupied_rooms,
        v_rent_income.occupancy_rate
    )
    ON CONFLICT (property_id, year_month)
    DO UPDATE SET
        total_rent_income = EXCLUDED.total_rent_income,
        total_management_fee_income = EXCLUDED.total_management_fee_income,
        gross_income = EXCLUDED.gross_income,
        expense_management_fee = EXCLUDED.expense_management_fee,
        expense_repair_cost = EXCLUDED.expense_repair_cost,
        expense_tax = EXCLUDED.expense_tax,
        expense_insurance = EXCLUDED.expense_insurance,
        expense_utilities = EXCLUDED.expense_utilities,
        expense_cleaning = EXCLUDED.expense_cleaning,
        expense_other = EXCLUDED.expense_other,
        total_expenses = EXCLUDED.total_expenses,
        loan_principal_payment = EXCLUDED.loan_principal_payment,
        loan_interest_payment = EXCLUDED.loan_interest_payment,
        total_loan_payment = EXCLUDED.total_loan_payment,
        net_operating_income = EXCLUDED.net_operating_income,
        cash_flow_before_tax = EXCLUDED.cash_flow_before_tax,
        total_rooms = EXCLUDED.total_rooms,
        occupied_rooms = EXCLUDED.occupied_rooms,
        occupancy_rate = EXCLUDED.occupancy_rate,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 月次集計バッチ処理関数
-- ========================================
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

-- ========================================
-- 古いキューエントリのクリーンアップ関数
-- ========================================
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

-- ========================================
-- 借入残高更新トリガーの最適化
-- ========================================
DROP TRIGGER IF EXISTS trigger_loan_balance_update ON loan_payments;
DROP FUNCTION IF EXISTS trigger_update_loan_balance();

-- 最適化された借入残高更新関数
CREATE OR REPLACE FUNCTION update_loan_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- 返済が完了した場合のみ借入残高を更新
    IF NEW.is_completed = TRUE AND (OLD.is_completed IS NULL OR OLD.is_completed = FALSE) THEN
        UPDATE loans
        SET 
            current_balance = NEW.balance_after_payment,
            last_payment_date = NEW.payment_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.loan_id
        AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in update_loan_balance_on_payment: Loan %, Error: %', NEW.loan_id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 新しいトリガー設定
CREATE TRIGGER trigger_loan_balance_update
    AFTER UPDATE ON loan_payments
    FOR EACH ROW
    WHEN (NEW.is_completed = TRUE AND OLD.is_completed = FALSE)
    EXECUTE FUNCTION update_loan_balance_on_payment();

-- ========================================
-- 定期実行用のスケジューラー関数
-- ========================================
CREATE OR REPLACE FUNCTION schedule_monthly_summary_updates()
RETURNS VOID AS $$
BEGIN
    -- 現在月と前月のデータを確実に更新
    INSERT INTO monthly_summary_update_queue (property_id, year_month)
    SELECT DISTINCT
        p.id,
        DATE_TRUNC('month', CURRENT_DATE) as year_month
    FROM properties p
    WHERE p.deleted_at IS NULL
    ON CONFLICT (property_id, year_month) DO NOTHING;
    
    -- 前月分も更新
    INSERT INTO monthly_summary_update_queue (property_id, year_month)
    SELECT DISTINCT
        p.id,
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') as year_month
    FROM properties p
    WHERE p.deleted_at IS NULL
    ON CONFLICT (property_id, year_month) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- コメント追加
COMMENT ON FUNCTION queue_monthly_summary_update IS 'トリガーから呼ばれる軽量なキュー追加関数';
COMMENT ON FUNCTION process_monthly_summary_queue IS 'バッチ処理で月次集計を更新する関数';
COMMENT ON FUNCTION cleanup_monthly_summary_queue IS '古いキューエントリをクリーンアップする関数';
COMMENT ON FUNCTION schedule_monthly_summary_updates IS '定期的に全物件の月次集計を更新するための関数';