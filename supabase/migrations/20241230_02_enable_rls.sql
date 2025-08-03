-- ========================================
-- RichmanManage データベーススキーマ Phase 2
-- RLS（Row Level Security）設定とセキュリティ実装
-- ========================================

-- ========================================
-- RLSの有効化
-- ========================================

-- 全テーブルでRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ヘルパー関数の作成
-- ========================================

-- 現在のユーザーIDを取得する関数
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーが物件の所有者かどうかを確認する関数
CREATE OR REPLACE FUNCTION is_property_owner(property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM properties p
        WHERE p.id = property_id 
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーのロールを取得する関数
CREATE OR REPLACE FUNCTION get_user_role()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- users テーブルのRLSポリシー
-- ========================================

-- 自分の情報のみ閲覧可能
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (id = auth.uid() OR get_user_role() = 'admin');

-- 自分の情報のみ更新可能
CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 新規登録は認証済みユーザーのみ可能
CREATE POLICY users_insert_policy ON users
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- 削除は自分のアカウントのみ可能（論理削除）
CREATE POLICY users_delete_policy ON users
    FOR DELETE
    USING (id = auth.uid());

-- ========================================
-- properties テーブルのRLSポリシー
-- ========================================

-- 自分が所有する物件のみ閲覧可能
CREATE POLICY properties_select_policy ON properties
    FOR SELECT
    USING (
        user_id = auth.uid() 
        OR get_user_role() = 'admin'
        OR (get_user_role() = 'viewer' AND user_id IN (
            SELECT id FROM users WHERE id = auth.uid()
        ))
    );

-- 自分の物件のみ作成可能
CREATE POLICY properties_insert_policy ON properties
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分が所有する物件のみ更新可能
CREATE POLICY properties_update_policy ON properties
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 自分が所有する物件のみ削除可能（論理削除）
CREATE POLICY properties_delete_policy ON properties
    FOR DELETE
    USING (user_id = auth.uid());

-- ========================================
-- loans テーブルのRLSポリシー
-- ========================================

-- 自分が所有する物件の借入のみ閲覧可能
CREATE POLICY loans_select_policy ON loans
    FOR SELECT
    USING (is_property_owner(property_id) OR get_user_role() = 'admin');

-- 自分が所有する物件の借入のみ作成可能
CREATE POLICY loans_insert_policy ON loans
    FOR INSERT
    WITH CHECK (is_property_owner(property_id));

-- 自分が所有する物件の借入のみ更新可能
CREATE POLICY loans_update_policy ON loans
    FOR UPDATE
    USING (is_property_owner(property_id))
    WITH CHECK (is_property_owner(property_id));

-- 自分が所有する物件の借入のみ削除可能（論理削除）
CREATE POLICY loans_delete_policy ON loans
    FOR DELETE
    USING (is_property_owner(property_id));

-- ========================================
-- rent_rolls テーブルのRLSポリシー
-- ========================================

-- 自分が所有する物件のレントロールのみ閲覧可能
CREATE POLICY rent_rolls_select_policy ON rent_rolls
    FOR SELECT
    USING (is_property_owner(property_id) OR get_user_role() = 'admin');

-- 自分が所有する物件のレントロールのみ作成可能
CREATE POLICY rent_rolls_insert_policy ON rent_rolls
    FOR INSERT
    WITH CHECK (is_property_owner(property_id));

-- 自分が所有する物件のレントロールのみ更新可能
CREATE POLICY rent_rolls_update_policy ON rent_rolls
    FOR UPDATE
    USING (is_property_owner(property_id))
    WITH CHECK (is_property_owner(property_id));

-- 自分が所有する物件のレントロールのみ削除可能（論理削除）
CREATE POLICY rent_rolls_delete_policy ON rent_rolls
    FOR DELETE
    USING (is_property_owner(property_id));

-- ========================================
-- expenses テーブルのRLSポリシー
-- ========================================

-- 自分が所有する物件の支出のみ閲覧可能
CREATE POLICY expenses_select_policy ON expenses
    FOR SELECT
    USING (is_property_owner(property_id) OR get_user_role() = 'admin');

-- 自分が所有する物件の支出のみ作成可能
CREATE POLICY expenses_insert_policy ON expenses
    FOR INSERT
    WITH CHECK (is_property_owner(property_id));

-- 自分が所有する物件の支出のみ更新可能
CREATE POLICY expenses_update_policy ON expenses
    FOR UPDATE
    USING (is_property_owner(property_id))
    WITH CHECK (is_property_owner(property_id));

-- 自分が所有する物件の支出のみ削除可能（論理削除）
CREATE POLICY expenses_delete_policy ON expenses
    FOR DELETE
    USING (is_property_owner(property_id));

-- ========================================
-- loan_payments テーブルのRLSポリシー
-- ========================================

-- 自分が所有する物件の借入に関する返済履歴のみ閲覧可能
CREATE POLICY loan_payments_select_policy ON loan_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM loans l
            WHERE l.id = loan_payments.loan_id
            AND is_property_owner(l.property_id)
        )
        OR get_user_role() = 'admin'
    );

-- 自分が所有する物件の借入に関する返済履歴のみ作成可能
CREATE POLICY loan_payments_insert_policy ON loan_payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM loans l
            WHERE l.id = loan_payments.loan_id
            AND is_property_owner(l.property_id)
        )
    );

-- 自分が所有する物件の借入に関する返済履歴のみ更新可能
CREATE POLICY loan_payments_update_policy ON loan_payments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM loans l
            WHERE l.id = loan_payments.loan_id
            AND is_property_owner(l.property_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM loans l
            WHERE l.id = loan_payments.loan_id
            AND is_property_owner(l.property_id)
        )
    );

-- 自分が所有する物件の借入に関する返済履歴のみ削除可能
CREATE POLICY loan_payments_delete_policy ON loan_payments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM loans l
            WHERE l.id = loan_payments.loan_id
            AND is_property_owner(l.property_id)
        )
    );

-- ========================================
-- 追加のセキュリティ関数
-- ========================================

-- 物件に関連するすべてのデータの所有権を確認する関数
CREATE OR REPLACE FUNCTION check_property_data_ownership(
    p_table_name TEXT,
    p_property_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_owner_id UUID;
    v_current_user_id UUID;
BEGIN
    -- 現在のユーザーIDを取得
    v_current_user_id := auth.uid();
    
    -- 物件の所有者IDを取得
    SELECT user_id INTO v_owner_id
    FROM properties
    WHERE id = p_property_id
    AND deleted_at IS NULL;
    
    -- 所有者確認
    RETURN v_owner_id = v_current_user_id OR get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- データ整合性チェック関数
-- ========================================

-- 論理削除時の関連データチェック関数
CREATE OR REPLACE FUNCTION check_before_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- 物件が削除される場合、関連データが存在しないことを確認
    IF TG_TABLE_NAME = 'properties' AND NEW.deleted_at IS NOT NULL THEN
        -- アクティブな借入が存在する場合はエラー
        IF EXISTS (
            SELECT 1 FROM loans 
            WHERE property_id = NEW.id 
            AND deleted_at IS NULL
            AND current_balance > 0
        ) THEN
            RAISE EXCEPTION 'Cannot delete property with active loans';
        END IF;
        
        -- 入居中の部屋が存在する場合はエラー
        IF EXISTS (
            SELECT 1 FROM rent_rolls 
            WHERE property_id = NEW.id 
            AND deleted_at IS NULL
            AND room_status = 'occupied'
        ) THEN
            RAISE EXCEPTION 'Cannot delete property with occupied rooms';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 物件削除前チェックトリガー
CREATE TRIGGER check_property_before_soft_delete
    BEFORE UPDATE OF deleted_at ON properties
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION check_before_soft_delete();

-- ========================================
-- アクセスログ記録用のテーブルとトリガー（オプション）
-- ========================================

-- アクセスログテーブル
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    record_id UUID,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- アクセスログ記録関数
CREATE OR REPLACE FUNCTION log_data_access()
RETURNS TRIGGER AS $$
BEGIN
    -- 重要な操作（UPDATE, DELETE）のみログに記録
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        INSERT INTO access_logs (
            user_id,
            table_name,
            operation,
            record_id
        ) VALUES (
            auth.uid(),
            TG_TABLE_NAME,
            TG_OP,
            CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.id
                ELSE NEW.id
            END
        );
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 各テーブルにアクセスログトリガーを設定（重要な操作のみ）
CREATE TRIGGER log_properties_access
    AFTER UPDATE OR DELETE ON properties
    FOR EACH ROW EXECUTE FUNCTION log_data_access();

CREATE TRIGGER log_loans_access
    AFTER UPDATE OR DELETE ON loans
    FOR EACH ROW EXECUTE FUNCTION log_data_access();

CREATE TRIGGER log_expenses_access
    AFTER UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION log_data_access();

-- ========================================
-- RLSポリシーのコメント
-- ========================================

COMMENT ON POLICY users_select_policy ON users IS '自分の情報またはadminロールのみ閲覧可能';
COMMENT ON POLICY properties_select_policy ON properties IS '自分が所有する物件のみ閲覧可能';
COMMENT ON POLICY loans_select_policy ON loans IS '自分が所有する物件の借入のみ閲覧可能';
COMMENT ON POLICY rent_rolls_select_policy ON rent_rolls IS '自分が所有する物件のレントロールのみ閲覧可能';
COMMENT ON POLICY expenses_select_policy ON expenses IS '自分が所有する物件の支出のみ閲覧可能';
COMMENT ON POLICY loan_payments_select_policy ON loan_payments IS '自分が所有する物件の借入返済履歴のみ閲覧可能';