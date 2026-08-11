-- Monthly revenue targets per sales rep, set by admins.
-- Keyed by user_id + month, so it automatically accommodates new reps —
-- there's nothing to migrate when a rep is added or removed, an admin
-- just sets (or never sets) a row for that user.

CREATE TABLE IF NOT EXISTS rep_targets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- always the 1st of the month, e.g. 2026-08-01
    target_amount NUMERIC NOT NULL DEFAULT 0,
    set_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_rep_targets_month ON rep_targets(month);
CREATE INDEX IF NOT EXISTS idx_rep_targets_user ON rep_targets(user_id);

COMMENT ON TABLE rep_targets IS 'Admin-set monthly revenue targets per sales rep, used to drive dashboard progress bars';

-- A "Both" (groups + channel) sale is booked as two linked adverts rather
-- than a new destination type, so the existing single-destination approval/
-- slot-assignment flow doesn't need to change. bundle_ref just ties the pair
-- together for reporting — nullable, unused for normal single-destination adverts.
ALTER TABLE adverts ADD COLUMN IF NOT EXISTS bundle_ref VARCHAR(40);
CREATE INDEX IF NOT EXISTS idx_adverts_bundle_ref ON adverts(bundle_ref) WHERE bundle_ref IS NOT NULL;
