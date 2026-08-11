-- Captures the "log the competitor" rule from the sales kit as real,
-- queryable data instead of a rule nobody can audit. Logged by a rep
-- whenever a client says another operator is cheaper.

CREATE TABLE IF NOT EXISTS competitor_mentions (
    id SERIAL PRIMARY KEY,
    sales_rep_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_name VARCHAR(255),
    competitor_name VARCHAR(255) NOT NULL,
    competitor_price NUMERIC,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_competitor_mentions_rep ON competitor_mentions(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_competitor_mentions_created ON competitor_mentions(created_at DESC);

COMMENT ON TABLE competitor_mentions IS 'Competitor name/price a client mentioned during a sales conversation, logged by the rep';
