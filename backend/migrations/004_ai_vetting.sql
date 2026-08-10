-- Migration 004: AI advert vetting and standardized rewrite
-- Adds a field for the actual creative text to be posted (separate from the
-- short internal `caption` used on invoices), plus columns to hold the
-- vetting engine's verdict and the standardized rewrite it proposes.

ALTER TABLE adverts
    ADD COLUMN IF NOT EXISTS ad_content    TEXT,
    ADD COLUMN IF NOT EXISTS ai_verdict    VARCHAR(20),
    ADD COLUMN IF NOT EXISTS ai_reasoning  TEXT,
    ADD COLUMN IF NOT EXISTS ai_flags      TEXT[],
    ADD COLUMN IF NOT EXISTS ai_rewrite    TEXT,
    ADD COLUMN IF NOT EXISTS ai_scanned_at TIMESTAMP;

-- ai_verdict is one of: 'accept', 'reject', 'tweak', or NULL (not yet scanned)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'adverts_ai_verdict_chk'
    ) THEN
        ALTER TABLE adverts DROP CONSTRAINT adverts_ai_verdict_chk;
    END IF;

    ALTER TABLE adverts
        ADD CONSTRAINT adverts_ai_verdict_chk
        CHECK (ai_verdict IS NULL OR ai_verdict IN ('accept', 'reject', 'tweak'));
END $$;

CREATE INDEX IF NOT EXISTS idx_adverts_ai_verdict ON adverts(ai_verdict);
