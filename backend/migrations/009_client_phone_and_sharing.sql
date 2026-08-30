-- Two changes driven by the client-duplication problem:
--
-- 1. Phone is now the identity key for a client. Going forward it's required
--    and normalized to +263XXXXXXXXX (see backend/src/utils/phone.js), and
--    this unique index makes it impossible for two client rows to share a
--    phone number — the actual mechanism that stops new duplicates, not
--    just a policy asking reps not to create them. Partial (WHERE phone IS
--    NOT NULL) so it doesn't break existing rows that predate this and have
--    no phone on file.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_unique
  ON clients (phone) WHERE phone IS NOT NULL;

-- 2. Clients were previously only findable by the rep who created them
--    (every query filtered on sales_rep_id = the logged-in user), which is
--    the real reason reps kept re-creating the same client under slightly
--    different name spellings — they couldn't see each other's records to
--    reuse them. sales_rep_id now means "current owner for commission
--    purposes" (see the 60-day dormancy policy), not "who can see this
--    row" — visibility becomes company-wide in the application layer.
--    No schema change needed for that, just noting the meaning shift here
--    since it's not visible from the column definition alone.
