-- ========================================
-- RichmanManage データベーススキーマ修正
-- Phase 1.2: 金額データ型の修正
-- 不動産投資の精密な計算に対応
-- ========================================

-- ========================================
-- propertiesテーブルの金額フィールド修正
-- ========================================
ALTER TABLE properties 
ALTER COLUMN purchase_price TYPE DECIMAL(15,2);

ALTER TABLE properties 
ALTER COLUMN current_valuation TYPE DECIMAL(15,2);

ALTER TABLE properties 
ALTER COLUMN land_area TYPE DECIMAL(10,2);

ALTER TABLE properties 
ALTER COLUMN building_area TYPE DECIMAL(10,2);

-- ========================================
-- rent_rollsテーブルの金額フィールド修正
-- ========================================
ALTER TABLE rent_rolls 
ALTER COLUMN monthly_rent TYPE DECIMAL(10,2);

ALTER TABLE rent_rolls 
ALTER COLUMN monthly_management_fee TYPE DECIMAL(10,2);

ALTER TABLE rent_rolls 
ALTER COLUMN room_area TYPE DECIMAL(8,2);

-- 計算フィールドの再作成
ALTER TABLE rent_rolls 
DROP COLUMN IF EXISTS total_monthly_income;

ALTER TABLE rent_rolls 
ADD COLUMN total_monthly_income DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE 
        WHEN room_status = 'occupied' THEN 
            COALESCE(monthly_rent, 0) + COALESCE(monthly_management_fee, 0)
        ELSE 0 
    END
) STORED;

-- ========================================
-- expensesテーブルの金額フィールド修正
-- ========================================
ALTER TABLE expenses 
ALTER COLUMN amount TYPE DECIMAL(15,2);

-- ========================================
-- loansテーブルの金額フィールド修正
-- ========================================
ALTER TABLE loans 
ALTER COLUMN principal_amount TYPE DECIMAL(15,2);

ALTER TABLE loans 
ALTER COLUMN monthly_payment TYPE DECIMAL(15,2);

ALTER TABLE loans 
ALTER COLUMN current_balance TYPE DECIMAL(15,2);

-- 金利の精度も修正（5桁3小数から6桁4小数へ）
ALTER TABLE loans 
ALTER COLUMN initial_interest_rate TYPE DECIMAL(6,4);

-- ========================================
-- loan_paymentsテーブルの金額フィールド修正
-- ========================================
ALTER TABLE loan_payments 
ALTER COLUMN payment_amount TYPE DECIMAL(15,2);

ALTER TABLE loan_payments 
ALTER COLUMN principal_amount TYPE DECIMAL(15,2);

ALTER TABLE loan_payments 
ALTER COLUMN interest_amount TYPE DECIMAL(15,2);

ALTER TABLE loan_payments 
ALTER COLUMN balance_after_payment TYPE DECIMAL(15,2);

-- ========================================
-- property_monthly_summariesテーブルの金額フィールド修正
-- ========================================
ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_rent_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_management_fee_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_other_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN gross_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_management_fee TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_repair_cost TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_tax TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_insurance TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_utilities TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_cleaning TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN expense_other TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_expenses TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN loan_principal_payment TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN loan_interest_payment TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN total_loan_payment TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN net_operating_income TYPE DECIMAL(15,2);

ALTER TABLE property_monthly_summaries 
ALTER COLUMN cash_flow_before_tax TYPE DECIMAL(15,2);

-- ========================================
-- 金利変更履歴テーブルの作成（既存のloan_interest_changesテーブルがある場合）
-- ========================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loan_interest_changes') THEN
        ALTER TABLE loan_interest_changes 
        ALTER COLUMN previous_rate TYPE DECIMAL(6,4);
        
        ALTER TABLE loan_interest_changes 
        ALTER COLUMN new_rate TYPE DECIMAL(6,4);
    END IF;
END $$;

-- ========================================
-- ビューの再作成（金額フィールドの精度変更に対応）
-- ========================================
DROP VIEW IF EXISTS v_property_current_status CASCADE;

CREATE OR REPLACE VIEW v_property_current_status AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    p.prefecture,
    p.city,
    p.purchase_price,
    p.current_valuation,
    -- 最新月のサマリー情報
    COALESCE(s.gross_income, 0::DECIMAL(15,2)) as monthly_income,
    COALESCE(s.total_expenses, 0::DECIMAL(15,2)) as monthly_expenses,
    COALESCE(s.total_loan_payment, 0::DECIMAL(15,2)) as monthly_loan_payment,
    COALESCE(s.cash_flow_before_tax, 0::DECIMAL(15,2)) as monthly_cash_flow,
    COALESCE(s.occupancy_rate, 0::DECIMAL(5,2)) as occupancy_rate,
    -- 年間換算
    COALESCE(s.gross_income * 12, 0::DECIMAL(15,2)) as annual_income,
    COALESCE(s.cash_flow_before_tax * 12, 0::DECIMAL(15,2)) as annual_cash_flow,
    -- 利回り計算（小数点以下2桁）
    CASE 
        WHEN p.purchase_price > 0 THEN 
            ROUND((COALESCE(s.gross_income * 12, 0) / p.purchase_price * 100)::DECIMAL(5,2), 2)
        ELSE 0::DECIMAL(5,2)
    END as gross_yield,
    CASE 
        WHEN p.purchase_price > 0 THEN 
            ROUND((COALESCE(s.net_operating_income * 12, 0) / p.purchase_price * 100)::DECIMAL(5,2), 2)
        ELSE 0::DECIMAL(5,2)
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
-- 集計関数の更新（精度変更に対応）
-- ========================================
CREATE OR REPLACE FUNCTION calculate_monthly_rent_income(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS TABLE (
    total_rent DECIMAL(15,2),
    total_management_fee DECIMAL(15,2),
    occupied_rooms INTEGER,
    total_rooms INTEGER,
    occupancy_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN rr.room_status = 'occupied' THEN rr.monthly_rent ELSE 0 END), 0)::DECIMAL(15,2) as total_rent,
        COALESCE(SUM(CASE WHEN rr.room_status = 'occupied' THEN rr.monthly_management_fee ELSE 0 END), 0)::DECIMAL(15,2) as total_management_fee,
        COUNT(CASE WHEN rr.room_status = 'occupied' THEN 1 END)::INTEGER as occupied_rooms,
        COUNT(*)::INTEGER as total_rooms,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN rr.room_status = 'occupied' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100), 2)::DECIMAL(5,2)
            ELSE 0::DECIMAL(5,2)
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

CREATE OR REPLACE FUNCTION calculate_monthly_expenses(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS TABLE (
    expense_management_fee DECIMAL(15,2),
    expense_repair_cost DECIMAL(15,2),
    expense_tax DECIMAL(15,2),
    expense_insurance DECIMAL(15,2),
    expense_utilities DECIMAL(15,2),
    expense_cleaning DECIMAL(15,2),
    expense_other DECIMAL(15,2),
    total_expenses DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN e.category = 'management_fee' THEN e.amount ELSE 0 END), 0)::DECIMAL(15,2) as expense_management_fee,
        COALESCE(SUM(CASE WHEN e.category = 'repair_cost' THEN e.amount ELSE 0 END), 0)::DECIMAL(15,2) as expense_repair_cost,
        COALESCE(SUM(CASE WHEN e.category = 'tax' THEN e.amount ELSE 0 END), 0)::DECIMAL(15,2) as expense_tax,
        COALESCE(SUM(CASE WHEN e.category = 'insurance' THEN e.amount ELSE 0 END), 0)::DECIMAL(15,2) as expense_insurance,
        COALESCE(SUM(CASE WHEN e.category = 'utilities' THEN e.amount ELSE 0 END), 0)::DECIMAL(15,2) as expense_utilities,
        COALESCE(SUM(CASE WHEN e.category = 'cleaning' THEN e.amount ELSE 0 END), 0)::DECIMAL(15,2) as expense_cleaning,
        COALESCE(SUM(CASE WHEN e.category = 'other' THEN e.amount ELSE 0 END), 0)::DECIMAL(15,2) as expense_other,
        COALESCE(SUM(e.amount), 0)::DECIMAL(15,2) as total_expenses
    FROM expenses e
    WHERE e.property_id = p_property_id
    AND e.deleted_at IS NULL
    AND DATE_TRUNC('month', e.expense_date) = p_year_month;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_monthly_loan_payments(
    p_property_id UUID,
    p_year_month DATE
)
RETURNS TABLE (
    loan_principal_payment DECIMAL(15,2),
    loan_interest_payment DECIMAL(15,2),
    total_loan_payment DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(lp.principal_amount), 0)::DECIMAL(15,2) as loan_principal_payment,
        COALESCE(SUM(lp.interest_amount), 0)::DECIMAL(15,2) as loan_interest_payment,
        COALESCE(SUM(lp.payment_amount), 0)::DECIMAL(15,2) as total_loan_payment
    FROM loan_payments lp
    JOIN loans l ON lp.loan_id = l.id
    WHERE l.property_id = p_property_id
    AND l.deleted_at IS NULL
    AND DATE_TRUNC('month', lp.payment_date) = p_year_month
    AND lp.is_completed = TRUE;
END;
$$ LANGUAGE plpgsql;

-- コメント追加
COMMENT ON COLUMN properties.purchase_price IS '購入価格（小数点以下2桁まで）';
COMMENT ON COLUMN properties.current_valuation IS '現在の評価額（小数点以下2桁まで）';
COMMENT ON COLUMN rent_rolls.monthly_rent IS '月額家賃（小数点以下2桁まで）';
COMMENT ON COLUMN rent_rolls.monthly_management_fee IS '月額管理費（小数点以下2桁まで）';
COMMENT ON COLUMN loans.initial_interest_rate IS '初期金利（%、小数点以下4桁まで）';
COMMENT ON COLUMN expenses.amount IS '支出金額（小数点以下2桁まで）';