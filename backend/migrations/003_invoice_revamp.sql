-- Migration 003: Invoice revamp
-- Adds billing/tax fields to clients, enforces caption length on adverts,
-- and tightens invoice status to PAID-only.

-- 1. Extend clients with billing-ready fields
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS contact_person   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line1    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line2    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city             VARCHAR(100),
    ADD COLUMN IF NOT EXISTS country          VARCHAR(100) DEFAULT 'Zimbabwe',
    ADD COLUMN IF NOT EXISTS tin              VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vat_number       VARCHAR(50);

-- 2. Enforce caption length (10–200 chars) on adverts
--    Drop first if it already exists so this migration is re-runnable.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'adverts_caption_length_chk'
    ) THEN
        ALTER TABLE adverts DROP CONSTRAINT adverts_caption_length_chk;
    END IF;
END $$;

ALTER TABLE adverts
    ADD CONSTRAINT adverts_caption_length_chk
    CHECK (char_length(caption) BETWEEN 10 AND 200);

-- 3. Invoices are always PAID (all ads entering the system are paid up)
ALTER TABLE invoices
    ALTER COLUMN status SET DEFAULT 'PAID';

UPDATE invoices SET status = 'PAID' WHERE status IS DISTINCT FROM 'PAID';

-- 4. Index for faster client lookups by TIN (optional but cheap)
CREATE INDEX IF NOT EXISTS idx_clients_tin ON clients(tin) WHERE tin IS NOT NULL;
