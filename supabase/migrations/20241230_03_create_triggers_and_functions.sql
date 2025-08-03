-- ========================================
-- RichmanManage データベーススキーマ Phase 3
-- トリガーと集計関数の実装
-- ========================================

-- ========================================
-- 集計用テーブルの作成
-- ========================================

-- 物件別月次サマリーテーブル
CREATE TABLE property_monthly_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    year_month DATE NOT NULL, -- YYYY-MM-01形式で保存
    
    -- 収入情報
    total_rent_income DECIMAL(15,0) DEFAULT 0,
    total_management_fee_income DECIMAL(15,0) DEFAULT 0,
    total_other_income DECIMAL(15,0) DEFAULT 0,
    gross_income DECIMAL(15,0) DEFAULT 0,
    
    -- 支出情報
    expense_management_fee DECIMAL(15,0) DEFAULT 0,
    expense_repair_cost DECIMAL(15,0) DEFAULT 0,
    expense_tax DECIMAL(15,0) DEFAULT 0,
    expense_insurance DECIMAL(15,0) DEFAULT 0,
    expense_utilities DECIMAL(15,0) DEFAULT 0,
    expense_cleaning DECIMAL(15,0) DEFAULT 0,
    expense_other DECIMAL(15,0) DEFAULT 0,
    total_expenses DECIMAL(15,0) DEFAULT 0,
    
    -- 借入返済情報
    loan_principal_payment DECIMAL(15,0) DEFAULT 0,
    loan_interest_payment DECIMAL(15,0) DEFAULT 0,
    total_loan_payment DECIMAL(15,0) DEFAULT 0,
    
    -- キャッシュフロー
    net_operating_income DECIMAL(15,0) DEFAULT 0, -- 総収入 - 総支出
    cash_flow_before_tax DECIMAL(15,0) DEFAULT 0, -- NOI - 借入返済
    
    -- 稼働率
    total_rooms INTEGER DEFAULT 0,
    occupied_rooms INTEGER DEFAULT 0,
    occupancy_rate DECIMAL(5,2) DEFAULT 0,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- ユニーク制約
    CONSTRAINT unique_property_month UNIQUE (property_id, year_month)
);

-- インデックス作成
CREATE INDEX idx_property_monthly_summaries_property_id ON property_monthly_summaries(property_id);
CREATE INDEX idx_property_monthly_summaries_year_month ON property_monthly_summaries(year_month);

-- ========================================
-- 集計関数の作成
-- ========================================

-- 1. レントロールから月次収入を集計する関数
CREATE OR REPLACE FUNCTION calculate_monthly_rent_income(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS TABLE (
    total_rent DECIMAL(15,0),
    total_management_fee DECIMAL(15,0),
    occupied_rooms INTEGER,
    total_rooms INTEGER,
    occupancy_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN rr.room_status = 'occupied' THEN rr.monthly_rent ELSE 0 END), 0) as total_rent,
        COALESCE(SUM(CASE WHEN rr.room_status = 'occupied' THEN rr.monthly_management_fee ELSE 0 END), 0) as total_management_fee,
        COUNT(CASE WHEN rr.room_status = 'occupied' THEN 1 END)::INTEGER as occupied_rooms,
        COUNT(*)::INTEGER as total_rooms,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN rr.room_status = 'occupied' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100), 2)
            ELSE 0
        END as occupancy_rate
    FROM rent_rolls rr
    WHERE rr.property_id = p_property_id
    AND rr.deleted_at IS NULL
    AND (
        -- 指定月に有効なレントロール
        (rr.lease_start_date IS NULL OR rr.lease_start_date <= p_year_month + INTERVAL '1 month' - INTERVAL '1 day')
        AND (rr.lease_end_date IS NULL OR rr.lease_end_date >= p_year_month)
    );
END;
$$ LANGUAGE plpgsql;

-- 2. 支出をカテゴリ別に集計する関数
CREATE OR REPLACE FUNCTION calculate_monthly_expenses(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS TABLE (
    expense_management_fee DECIMAL(15,0),
    expense_repair_cost DECIMAL(15,0),
    expense_tax DECIMAL(15,0),
    expense_insurance DECIMAL(15,0),
    expense_utilities DECIMAL(15,0),
    expense_cleaning DECIMAL(15,0),
    expense_other DECIMAL(15,0),
    total_expenses DECIMAL(15,0)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN e.category = 'management_fee' THEN e.amount ELSE 0 END), 0) as expense_management_fee,
        COALESCE(SUM(CASE WHEN e.category = 'repair_cost' THEN e.amount ELSE 0 END), 0) as expense_repair_cost,
        COALESCE(SUM(CASE WHEN e.category = 'tax' THEN e.amount ELSE 0 END), 0) as expense_tax,
        COALESCE(SUM(CASE WHEN e.category = 'insurance' THEN e.amount ELSE 0 END), 0) as expense_insurance,
        COALESCE(SUM(CASE WHEN e.category = 'utilities' THEN e.amount ELSE 0 END), 0) as expense_utilities,
        COALESCE(SUM(CASE WHEN e.category = 'cleaning' THEN e.amount ELSE 0 END), 0) as expense_cleaning,
        COALESCE(SUM(CASE WHEN e.category = 'other' THEN e.amount ELSE 0 END), 0) as expense_other,
        COALESCE(SUM(e.amount), 0) as total_expenses
    FROM expenses e
    WHERE e.property_id = p_property_id
    AND e.deleted_at IS NULL
    AND DATE_TRUNC('month', e.expense_date) = p_year_month;
END;
$$ LANGUAGE plpgsql;

-- 3. 借入返済情報を集計する関数
CREATE OR REPLACE FUNCTION calculate_monthly_loan_payments(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS TABLE (
    loan_principal_payment DECIMAL(15,0),
    loan_interest_payment DECIMAL(15,0),
    total_loan_payment DECIMAL(15,0)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(lp.principal_amount), 0) as loan_principal_payment,
        COALESCE(SUM(lp.interest_amount), 0) as loan_interest_payment,
        COALESCE(SUM(lp.payment_amount), 0) as total_loan_payment
    FROM loan_payments lp
    JOIN loans l ON lp.loan_id = l.id
    WHERE l.property_id = p_property_id
    AND l.deleted_at IS NULL
    AND DATE_TRUNC('month', lp.payment_date) = p_year_month
    AND lp.is_completed = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. 月次サマリーを更新する統合関数
CREATE OR REPLACE FUNCTION update_property_monthly_summary(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS VOID AS $$
DECLARE
    v_rent_income RECORD;
    v_expenses RECORD;
    v_loan_payments RECORD;
    v_gross_income DECIMAL(15,0);
    v_net_operating_income DECIMAL(15,0);
    v_cash_flow_before_tax DECIMAL(15,0);
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
-- トリガー関数の作成
-- ========================================

-- 1. レントロール変更時のトリガー関数
CREATE OR REPLACE FUNCTION trigger_update_monthly_summary_on_rent_roll_change()
RETURNS TRIGGER AS $$
DECLARE
    v_property_id UUID;
    v_start_month DATE;
    v_end_month DATE;
    v_current_month DATE;
BEGIN
    -- 物件IDを取得
    IF TG_OP = 'DELETE' THEN
        v_property_id := OLD.property_id;
    ELSE
        v_property_id := NEW.property_id;
    END IF;
    
    -- 影響を受ける月の範囲を特定
    IF TG_OP = 'DELETE' THEN
        v_start_month := DATE_TRUNC('month', COALESCE(OLD.lease_start_date, OLD.created_at::DATE));
        v_end_month := DATE_TRUNC('month', COALESCE(OLD.lease_end_date, CURRENT_DATE));
    ELSIF TG_OP = 'INSERT' THEN
        v_start_month := DATE_TRUNC('month', COALESCE(NEW.lease_start_date, CURRENT_DATE));
        v_end_month := DATE_TRUNC('month', COALESCE(NEW.lease_end_date, CURRENT_DATE));
    ELSE -- UPDATE
        v_start_month := LEAST(
            DATE_TRUNC('month', COALESCE(OLD.lease_start_date, OLD.created_at::DATE)),
            DATE_TRUNC('month', COALESCE(NEW.lease_start_date, NEW.created_at::DATE))
        );
        v_end_month := GREATEST(
            DATE_TRUNC('month', COALESCE(OLD.lease_end_date, CURRENT_DATE)),
            DATE_TRUNC('month', COALESCE(NEW.lease_end_date, CURRENT_DATE))
        );
    END IF;
    
    -- 影響を受ける各月のサマリーを更新
    v_current_month := v_start_month;
    WHILE v_current_month <= v_end_month LOOP
        PERFORM update_property_monthly_summary(v_property_id, v_current_month);
        v_current_month := v_current_month + INTERVAL '1 month';
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 支出変更時のトリガー関数
CREATE OR REPLACE FUNCTION trigger_update_monthly_summary_on_expense_change()
RETURNS TRIGGER AS $$
DECLARE
    v_property_id UUID;
    v_expense_month DATE;
BEGIN
    -- 影響を受ける物件と月を特定
    IF TG_OP = 'DELETE' THEN
        v_property_id := OLD.property_id;
        v_expense_month := DATE_TRUNC('month', OLD.expense_date);
    ELSE
        v_property_id := NEW.property_id;
        v_expense_month := DATE_TRUNC('month', NEW.expense_date);
    END IF;
    
    -- UPDATEで日付が変更された場合は両方の月を更新
    IF TG_OP = 'UPDATE' AND OLD.expense_date != NEW.expense_date THEN
        PERFORM update_property_monthly_summary(OLD.property_id, DATE_TRUNC('month', OLD.expense_date));
    END IF;
    
    -- サマリーを更新
    PERFORM update_property_monthly_summary(v_property_id, v_expense_month);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 借入返済変更時のトリガー関数
CREATE OR REPLACE FUNCTION trigger_update_monthly_summary_on_loan_payment_change()
RETURNS TRIGGER AS $$
DECLARE
    v_property_id UUID;
    v_payment_month DATE;
BEGIN
    -- 影響を受ける物件と月を特定
    IF TG_OP = 'DELETE' THEN
        SELECT l.property_id INTO v_property_id
        FROM loans l
        WHERE l.id = OLD.loan_id;
        v_payment_month := DATE_TRUNC('month', OLD.payment_date);
    ELSE
        SELECT l.property_id INTO v_property_id
        FROM loans l
        WHERE l.id = NEW.loan_id;
        v_payment_month := DATE_TRUNC('month', NEW.payment_date);
    END IF;
    
    -- UPDATEで日付が変更された場合は両方の月を更新
    IF TG_OP = 'UPDATE' AND OLD.payment_date != NEW.payment_date THEN
        PERFORM update_property_monthly_summary(v_property_id, DATE_TRUNC('month', OLD.payment_date));
    END IF;
    
    -- サマリーを更新
    PERFORM update_property_monthly_summary(v_property_id, v_payment_month);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 借入残高更新トリガー関数
CREATE OR REPLACE FUNCTION trigger_update_loan_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- 返済が完了した場合のみ借入残高を更新
    IF NEW.is_completed = TRUE AND (OLD.is_completed IS NULL OR OLD.is_completed = FALSE) THEN
        UPDATE loans
        SET 
            current_balance = NEW.balance_after_payment,
            last_payment_date = NEW.payment_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.loan_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- トリガーの作成
-- ========================================

-- レントロール変更トリガー
CREATE TRIGGER trigger_rent_roll_change
    AFTER INSERT OR UPDATE OR DELETE ON rent_rolls
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_monthly_summary_on_rent_roll_change();

-- 支出変更トリガー
CREATE TRIGGER trigger_expense_change
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_monthly_summary_on_expense_change();

-- 借入返済変更トリガー
CREATE TRIGGER trigger_loan_payment_change
    AFTER INSERT OR UPDATE OR DELETE ON loan_payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_monthly_summary_on_loan_payment_change();

-- 借入残高更新トリガー
CREATE TRIGGER trigger_loan_balance_update
    AFTER UPDATE ON loan_payments
    FOR EACH ROW
    WHEN (NEW.is_completed = TRUE AND OLD.is_completed = FALSE)
    EXECUTE FUNCTION trigger_update_loan_balance();

-- ========================================
-- 便利な集計ビューの作成
-- ========================================

-- 物件別の最新サマリービュー
CREATE OR REPLACE VIEW v_property_current_status AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    p.prefecture,
    p.city,
    p.purchase_price,
    p.current_valuation,
    -- 最新月のサマリー情報
    COALESCE(s.gross_income, 0) as monthly_income,
    COALESCE(s.total_expenses, 0) as monthly_expenses,
    COALESCE(s.total_loan_payment, 0) as monthly_loan_payment,
    COALESCE(s.cash_flow_before_tax, 0) as monthly_cash_flow,
    COALESCE(s.occupancy_rate, 0) as occupancy_rate,
    -- 年間換算
    COALESCE(s.gross_income * 12, 0) as annual_income,
    COALESCE(s.cash_flow_before_tax * 12, 0) as annual_cash_flow,
    -- 利回り計算
    CASE 
        WHEN p.purchase_price > 0 THEN 
            ROUND((COALESCE(s.gross_income * 12, 0) / p.purchase_price * 100), 2)
        ELSE 0
    END as gross_yield,
    CASE 
        WHEN p.purchase_price > 0 THEN 
            ROUND((COALESCE(s.net_operating_income * 12, 0) / p.purchase_price * 100), 2)
        ELSE 0
    END as net_yield
FROM properties p
LEFT JOIN LATERAL (
    SELECT *
    FROM property_monthly_summaries pms
    WHERE pms.property_id = p.id
    ORDER BY pms.year_month DESC
    LIMIT 1
) s ON TRUE
WHERE p.deleted_at IS NULL;

-- ========================================
-- RLSポリシーの追加（集計テーブル用）
-- ========================================

ALTER TABLE property_monthly_summaries ENABLE ROW LEVEL SECURITY;

-- 自分が所有する物件のサマリーのみ閲覧可能
CREATE POLICY property_monthly_summaries_select_policy ON property_monthly_summaries
    FOR SELECT
    USING (is_property_owner(property_id) OR get_user_role() = 'admin');

-- サマリーの直接的な挿入・更新・削除は禁止（トリガー経由のみ）
CREATE POLICY property_monthly_summaries_no_direct_modify ON property_monthly_summaries
    FOR INSERT
    WITH CHECK (FALSE);

-- ========================================
-- コメントの追加
-- ========================================

COMMENT ON TABLE property_monthly_summaries IS '物件別月次収支サマリー（自動集計）';
COMMENT ON FUNCTION update_property_monthly_summary IS '物件の月次サマリーを更新する統合関数';
COMMENT ON VIEW v_property_current_status IS '物件別の最新状況と利回り情報';