-- ========================================
-- RichmanManage データベーススキーマ修正
-- Phase 1.1: 外部キー参照の修正
-- Supabase Authとの適切な連携パターン実装
-- ========================================

-- 既存のusersテーブルを削除（データ移行が必要な場合は事前にバックアップ）
DROP TABLE IF EXISTS users CASCADE;

-- ENUMタイプの再定義（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'owner', 'viewer');
    END IF;
END $$;

-- 新しいusersテーブル作成
CREATE TABLE users (
    -- auth.usersテーブルのidと同期
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- ユーザー基本情報
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'owner',
    
    -- プロフィール情報
    display_name TEXT,
    avatar_url TEXT,
    
    -- 設定情報
    timezone TEXT DEFAULT 'Asia/Tokyo',
    currency TEXT DEFAULT 'JPY',
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- 制約条件
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT valid_timezone CHECK (timezone IS NULL OR length(timezone) <= 50),
    CONSTRAINT valid_currency CHECK (currency IN ('JPY', 'USD', 'EUR'))
);

-- インデックス作成
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;

-- コメント追加
COMMENT ON TABLE users IS 'システムユーザー情報（auth.usersと同期）';
COMMENT ON COLUMN users.id IS 'auth.usersテーブルのIDと同一';
COMMENT ON COLUMN users.role IS 'ユーザーロール（admin: 管理者, owner: 物件所有者, viewer: 閲覧者）';
COMMENT ON COLUMN users.display_name IS '表示名（プロフィール用）';
COMMENT ON COLUMN users.timezone IS 'ユーザーのタイムゾーン設定';
COMMENT ON COLUMN users.currency IS '使用通貨設定';

-- ========================================
-- auth.usersとの同期トリガー実装
-- ========================================

-- ユーザー作成時の同期関数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- 既に存在する場合は更新
        UPDATE public.users 
        SET 
            email = NEW.email,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        -- エラーログを記録（実装は後述）
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザー更新時の同期関数
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET 
        email = NEW.email,
        display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', display_name),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_user_update: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザー削除時の同期関数（論理削除）
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET 
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.id;
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_user_delete: %', SQLERRM;
        RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー設定
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();

CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_delete();

-- ========================================
-- 既存テーブルの外部キー修正
-- ========================================

-- propertiesテーブルの外部キー修正
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_user_id_fkey;

ALTER TABLE properties 
ADD CONSTRAINT properties_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- コメント追加
COMMENT ON CONSTRAINT properties_user_id_fkey ON properties IS 'ユーザーとの外部キー制約（public.usersテーブル参照）';