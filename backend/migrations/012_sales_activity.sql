-- Sales Activity Log: every contact a sales rep makes, so management can see
-- activity, follow-ups, pipeline and objections. Idempotent — safe to re-run
-- (the seed inserts skip anything already present).

-- Prospects are lightweight client records created inline from the log form.
-- They live in clients so the unique-phone rule still prevents duplicates,
-- but are flagged so they can be told apart from real (booked) clients.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_prospect BOOLEAN NOT NULL DEFAULT false;

-- Admin-editable dropdown lists. Stored as labels, not ids, on each activity
-- so history stays readable if an option is later renamed or retired.
-- is_locked marks labels the app's own rules depend on (the outcomes): they
-- can be reordered but not renamed or deactivated.
CREATE TABLE IF NOT EXISTS sales_activity_options (
    id SERIAL PRIMARY KEY,
    list_key VARCHAR(30) NOT NULL,
    label VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (list_key, label)
);

-- Global settings (default daily contact target, working days per week).
CREATE TABLE IF NOT EXISTS sales_activity_settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(50) NOT NULL
);

-- Per-rep override of the default daily contact target.
CREATE TABLE IF NOT EXISTS sales_activity_rep_targets (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_target INTEGER NOT NULL CHECK (daily_target >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_activities (
    id SERIAL PRIMARY KEY,
    activity_date DATE NOT NULL,
    rep_user_id INTEGER NOT NULL REFERENCES users(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    contact_person VARCHAR(255) NOT NULL,
    contact_title VARCHAR(150),
    line_of_business VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    contact_method VARCHAR(100) NOT NULL,
    product_pitched VARCHAR(100),
    client_type VARCHAR(100) NOT NULL,
    outcome VARCHAR(100) NOT NULL,
    quoted_amount_usd NUMERIC(12, 2) CHECK (quoted_amount_usd IS NULL OR quoted_amount_usd >= 0),
    feedback_notes TEXT NOT NULL,
    main_objection VARCHAR(100),
    next_action VARCHAR(255),
    follow_up_date DATE,
    -- No hard deletes: a withdrawn entry stays in the table and the audit trail.
    is_withdrawn BOOLEAN NOT NULL DEFAULT false,
    withdrawn_at TIMESTAMP,
    withdrawn_by INTEGER REFERENCES users(id),
    withdraw_reason TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_activities_rep_date ON sales_activities(rep_user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_sales_activities_client ON sales_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_follow_up ON sales_activities(follow_up_date) WHERE NOT is_withdrawn;

-- One row per changed field per edit (and one per create / withdraw).
CREATE TABLE IF NOT EXISTS sales_activity_history (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES sales_activities(id),
    changed_by INTEGER NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(20) NOT NULL, -- created | updated | withdrawn
    field VARCHAR(50),
    old_value TEXT,
    new_value TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_activity_history_activity ON sales_activity_history(activity_id);

-- ---------------------------------------------------------------- seed data
INSERT INTO sales_activity_settings (key, value) VALUES
    ('default_daily_target', '10'),
    ('working_days_per_week', '6')
ON CONFLICT (key) DO NOTHING;

INSERT INTO sales_activity_options (list_key, label, sort_order, is_locked) VALUES
    ('contact_method', 'Phone call', 1, false),
    ('contact_method', 'WhatsApp', 2, false),
    ('contact_method', 'In-person visit', 3, false),
    ('contact_method', 'Email', 4, false),
    ('contact_method', 'Video call', 5, false),

    ('product_pitched', 'Banner / display ad', 1, false),
    ('product_pitched', 'Sponsored article', 2, false),
    ('product_pitched', 'WhatsApp broadcast', 3, false),
    ('product_pitched', 'Newsletter placement', 4, false),
    ('product_pitched', 'Package / retainer', 5, false),
    ('product_pitched', 'Not yet pitched', 6, false),

    ('outcome', 'Not reached', 1, true),
    ('outcome', 'Reached - not interested', 2, true),
    ('outcome', 'Reached - interested', 3, true),
    ('outcome', 'Meeting booked', 4, true),
    ('outcome', 'Quote sent', 5, true),
    ('outcome', 'Negotiating', 6, true),
    ('outcome', 'Closed - Won', 7, true),
    ('outcome', 'Closed - Lost', 8, true),

    ('main_objection', 'None', 1, false),
    ('main_objection', 'No budget', 2, false),
    ('main_objection', 'Already advertising elsewhere', 3, false),
    ('main_objection', 'Needs boss/board approval', 4, false),
    ('main_objection', 'Doubts our reach', 5, false),
    ('main_objection', 'Price too high', 6, false),
    ('main_objection', 'Call back later', 7, false),
    ('main_objection', 'No response', 8, false),
    ('main_objection', 'Other', 9, false),

    ('line_of_business', 'Agriculture & Farming', 1, false),
    ('line_of_business', 'Insurance & Financial Services', 2, false),
    ('line_of_business', 'Banking & Microfinance', 3, false),
    ('line_of_business', 'Retail & FMCG', 4, false),
    ('line_of_business', 'Telecoms & Technology', 5, false),
    ('line_of_business', 'Mining & Energy', 6, false),
    ('line_of_business', 'Real Estate & Construction', 7, false),
    ('line_of_business', 'Health & Pharmaceuticals', 8, false),
    ('line_of_business', 'Education & NGOs', 9, false),
    ('line_of_business', 'Government & Parastatals', 10, false),
    ('line_of_business', 'Hospitality & Tourism', 11, false),
    ('line_of_business', 'Transport & Logistics', 12, false),
    ('line_of_business', 'Other', 13, false),

    ('client_type', 'New client', 1, true),
    ('client_type', 'Repeat / follow-up', 2, true)
ON CONFLICT (list_key, label) DO NOTHING;
