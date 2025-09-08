-- Loans enhancements: owners, branch, notes; allow loans without property
-- 1) owner_kind enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'owner_kind') THEN
    CREATE TYPE owner_kind AS ENUM ('individual', 'corporation');
  END IF;
END $$;

-- 2) owners table
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_kind owner_kind NOT NULL DEFAULT 'individual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- 3) loans table alterations
-- 3a) property_id nullable（運転資金など物件非紐付けを許可）
ALTER TABLE loans ALTER COLUMN property_id DROP NOT NULL;

-- 3b) 支店・メモ欄の追加（存在しない場合）
ALTER TABLE loans ADD COLUMN IF NOT EXISTS branch_name TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3c) 借入主体（owner）を参照
ALTER TABLE loans ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES owners(id) ON DELETE SET NULL;

-- 4) 更新トリガ（updated_at）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_timestamp_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION set_timestamp_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_loans_set_updated_at'
  ) THEN
    CREATE TRIGGER tr_loans_set_updated_at
    BEFORE UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_updated_at();
  END IF;
END $$;

