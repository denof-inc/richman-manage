-- ========================================
-- RichmanManage データベーススキーマ修正
-- Phase 1.3: RLSポリシーの完全再設計
-- 適切な物件所有者確認とパフォーマンス最適化
-- ========================================

-- ========================================
-- 既存の問題のある関数を削除
-- ========================================
DROP FUNCTION IF EXISTS is_property_owner(UUID);
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS auth.user_id();

-- ========================================
-- 最適化されたヘルパー関数の実装
-- ========================================

-- 適切な物件所有者確認関数
CREATE OR REPLACE FUNCTION is_property_owner(property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM properties p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = property_id 
        AND u.id = auth.uid() 
        AND p.deleted_at IS NULL
        AND u.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ユーザーロール取得関数（キャッシュ対応）
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
    user_role_value user_role;
BEGIN
    SELECT role INTO user_role_value
    FROM users
    WHERE id = auth.uid()
    AND deleted_at IS NULL;
    
    RETURN COALESCE(user_role_value, 'viewer'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 管理者権限確認関数
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ローン所有者確認関数
CREATE OR REPLACE FUNCTION is_loan_owner(loan_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM loans l
        JOIN properties p ON l.property_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE l.id = loan_id 
        AND u.id = auth.uid() 
        AND l.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND u.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- コメント追加
COMMENT ON FUNCTION is_property_owner IS '物件所有者確認関数（RLSポリシーで使用）';
COMMENT ON FUNCTION get_current_user_role IS '現在のユーザーロール取得関数（キャッシュ対応）';
COMMENT ON FUNCTION is_admin IS '管理者権限確認関数';
COMMENT ON FUNCTION is_loan_owner IS 'ローン所有者確認関数（RLSポリシーで使用）';

-- ========================================
-- usersテーブルのRLSポリシー修正
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;

-- 新しいポリシーを作成
-- 自分の情報のみ参照可能（管理者は全ユーザー参照可能）
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (
        id = auth.uid() 
        OR is_admin()
    );

-- 自分の情報のみ更新可能
CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND deleted_at IS NULL
    );

-- 論理削除のみ許可（自分のアカウントのみ）
CREATE POLICY users_soft_delete_policy ON users
    FOR UPDATE
    USING (
        id = auth.uid() 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        id = auth.uid() 
        AND deleted_at IS NOT NULL
    );

-- ========================================
-- propertiesテーブルのRLSポリシー修正
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS properties_select_policy ON properties;
DROP POLICY IF EXISTS properties_update_policy ON properties;
DROP POLICY IF EXISTS properties_insert_policy ON properties;
DROP POLICY IF EXISTS properties_delete_policy ON properties;

-- 新しいポリシーを作成
-- 自分の物件のみ参照可能（管理者は全物件参照可能）
CREATE POLICY properties_select_policy ON properties
    FOR SELECT
    USING (
        (user_id = auth.uid() AND deleted_at IS NULL)
        OR is_admin()
    );

-- 自分の物件のみ更新可能
CREATE POLICY properties_update_policy ON properties
    FOR UPDATE
    USING (
        user_id = auth.uid() 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        user_id = auth.uid() 
        AND deleted_at IS NULL
    );

-- 自分の物件のみ作成可能
CREATE POLICY properties_insert_policy ON properties
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- 論理削除のみ許可
CREATE POLICY properties_soft_delete_policy ON properties
    FOR UPDATE
    USING (
        user_id = auth.uid() 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        user_id = auth.uid() 
        AND deleted_at IS NOT NULL
    );

-- ========================================
-- loansテーブルのRLSポリシー修正
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS loans_select_policy ON loans;
DROP POLICY IF EXISTS loans_update_policy ON loans;
DROP POLICY IF EXISTS loans_insert_policy ON loans;
DROP POLICY IF EXISTS loans_delete_policy ON loans;

-- 新しいポリシーを作成
CREATE POLICY loans_select_policy ON loans
    FOR SELECT
    USING (
        (is_property_owner(property_id) AND deleted_at IS NULL)
        OR is_admin()
    );

CREATE POLICY loans_update_policy ON loans
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    );

CREATE POLICY loans_insert_policy ON loans
    FOR INSERT
    WITH CHECK (
        is_property_owner(property_id)
    );

CREATE POLICY loans_soft_delete_policy ON loans
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NOT NULL
    );

-- ========================================
-- rent_rollsテーブルのRLSポリシー修正
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS rent_rolls_select_policy ON rent_rolls;
DROP POLICY IF EXISTS rent_rolls_update_policy ON rent_rolls;
DROP POLICY IF EXISTS rent_rolls_insert_policy ON rent_rolls;
DROP POLICY IF EXISTS rent_rolls_delete_policy ON rent_rolls;

-- 新しいポリシーを作成
CREATE POLICY rent_rolls_select_policy ON rent_rolls
    FOR SELECT
    USING (
        (is_property_owner(property_id) AND deleted_at IS NULL)
        OR is_admin()
    );

CREATE POLICY rent_rolls_update_policy ON rent_rolls
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    );

CREATE POLICY rent_rolls_insert_policy ON rent_rolls
    FOR INSERT
    WITH CHECK (
        is_property_owner(property_id)
    );

CREATE POLICY rent_rolls_soft_delete_policy ON rent_rolls
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NOT NULL
    );

-- ========================================
-- expensesテーブルのRLSポリシー修正
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS expenses_select_policy ON expenses;
DROP POLICY IF EXISTS expenses_update_policy ON expenses;
DROP POLICY IF EXISTS expenses_insert_policy ON expenses;
DROP POLICY IF EXISTS expenses_delete_policy ON expenses;

-- 新しいポリシーを作成
CREATE POLICY expenses_select_policy ON expenses
    FOR SELECT
    USING (
        (is_property_owner(property_id) AND deleted_at IS NULL)
        OR is_admin()
    );

CREATE POLICY expenses_update_policy ON expenses
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    );

CREATE POLICY expenses_insert_policy ON expenses
    FOR INSERT
    WITH CHECK (
        is_property_owner(property_id)
    );

CREATE POLICY expenses_soft_delete_policy ON expenses
    FOR UPDATE
    USING (
        is_property_owner(property_id) 
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_property_owner(property_id) 
        AND deleted_at IS NOT NULL
    );

-- ========================================
-- loan_paymentsテーブルのRLSポリシー修正
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS loan_payments_select_policy ON loan_payments;
DROP POLICY IF EXISTS loan_payments_update_policy ON loan_payments;
DROP POLICY IF EXISTS loan_payments_insert_policy ON loan_payments;
DROP POLICY IF EXISTS loan_payments_delete_policy ON loan_payments;

-- 新しいポリシーを作成
CREATE POLICY loan_payments_select_policy ON loan_payments
    FOR SELECT
    USING (
        is_loan_owner(loan_id)
        OR is_admin()
    );

CREATE POLICY loan_payments_update_policy ON loan_payments
    FOR UPDATE
    USING (
        is_loan_owner(loan_id)
    )
    WITH CHECK (
        is_loan_owner(loan_id)
    );

CREATE POLICY loan_payments_insert_policy ON loan_payments
    FOR INSERT
    WITH CHECK (
        is_loan_owner(loan_id)
    );

-- loan_paymentsは物理削除を許可
CREATE POLICY loan_payments_delete_policy ON loan_payments
    FOR DELETE
    USING (
        is_loan_owner(loan_id)
    );

-- ========================================
-- property_monthly_summariesテーブルのRLSポリシー修正
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS property_monthly_summaries_select_policy ON property_monthly_summaries;
DROP POLICY IF EXISTS property_monthly_summaries_no_direct_modify ON property_monthly_summaries;
DROP POLICY IF EXISTS property_monthly_summaries_system_only ON property_monthly_summaries;

-- 新しいポリシーを作成
CREATE POLICY property_monthly_summaries_select_policy ON property_monthly_summaries
    FOR SELECT
    USING (
        is_property_owner(property_id)
        OR is_admin()
    );

-- property_monthly_summariesは自動生成のため、直接のINSERT/UPDATE/DELETEは制限
CREATE POLICY property_monthly_summaries_no_insert ON property_monthly_summaries
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY property_monthly_summaries_no_update ON property_monthly_summaries
    FOR UPDATE
    USING (false)
    WITH CHECK (false);

CREATE POLICY property_monthly_summaries_no_delete ON property_monthly_summaries
    FOR DELETE
    USING (false);

-- ========================================
-- access_logsテーブルのRLSポリシー（存在する場合）
-- ========================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_logs') THEN
        -- RLSを有効化
        ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
        
        -- 管理者のみ参照可能
        CREATE POLICY access_logs_admin_only ON access_logs
            FOR ALL
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;
END $$;

-- ========================================
-- RLSポリシーのコメント追加
-- ========================================
COMMENT ON POLICY users_select_policy ON users IS '自分の情報または管理者のみ閲覧可能';
COMMENT ON POLICY users_update_policy ON users IS '自分の情報のみ更新可能';
COMMENT ON POLICY users_soft_delete_policy ON users IS '自分のアカウントの論理削除のみ可能';

COMMENT ON POLICY properties_select_policy ON properties IS '自分が所有する物件または管理者のみ閲覧可能';
COMMENT ON POLICY properties_update_policy ON properties IS '自分が所有する物件のみ更新可能';
COMMENT ON POLICY properties_insert_policy ON properties IS '自分の物件のみ作成可能';
COMMENT ON POLICY properties_soft_delete_policy ON properties IS '自分が所有する物件の論理削除のみ可能';

COMMENT ON POLICY loans_select_policy ON loans IS '自分が所有する物件の借入または管理者のみ閲覧可能';
COMMENT ON POLICY rent_rolls_select_policy ON rent_rolls IS '自分が所有する物件のレントロールまたは管理者のみ閲覧可能';
COMMENT ON POLICY expenses_select_policy ON expenses IS '自分が所有する物件の支出または管理者のみ閲覧可能';
COMMENT ON POLICY loan_payments_select_policy ON loan_payments IS '自分が所有する物件の借入返済履歴または管理者のみ閲覧可能';

COMMENT ON POLICY property_monthly_summaries_select_policy ON property_monthly_summaries IS '自分が所有する物件のサマリーまたは管理者のみ閲覧可能';
COMMENT ON POLICY property_monthly_summaries_no_insert ON property_monthly_summaries IS '直接挿入は禁止（トリガー経由のみ）';
COMMENT ON POLICY property_monthly_summaries_no_update ON property_monthly_summaries IS '直接更新は禁止（トリガー経由のみ）';
COMMENT ON POLICY property_monthly_summaries_no_delete ON property_monthly_summaries IS '直接削除は禁止';