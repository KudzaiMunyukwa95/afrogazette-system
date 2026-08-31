-- A client can legitimately be reachable on more than one number (a
-- business line plus the owner's cell, or a genuine duplicate record
-- surfacing a second real number once it's merged in) — clients.phone
-- stays the single primary number used for display/WhatsApp everywhere,
-- this table just tracks the others so a merge doesn't have to silently
-- throw one away.
CREATE TABLE IF NOT EXISTS client_phones (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_phones_client_id ON client_phones(client_id);
