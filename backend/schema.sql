-- ============================================
-- Complete SQL Schema for AfroGazette Database
-- Generated from database structure export
-- Database: PostgreSQL
-- ============================================

-- ============================================
-- CUSTOM TYPES (ENUMS)
-- ============================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('sales_rep', 'admin', 'super_admin');

-- Advert status enum
CREATE TYPE advert_status AS ENUM ('pending', 'active', 'expired', 'rejected');

-- Advert category enum (adjust values as needed based on your business)
CREATE TYPE advert_category AS ENUM ('general', 'business', 'event', 'promotion', 'announcement');

-- ============================================
-- TABLE: users
-- Description: System users including sales reps and admins
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'sales_rep',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: time_slots
-- Description: Available time slots for advertisement scheduling
-- ============================================
CREATE TABLE time_slots (
    id SERIAL PRIMARY KEY,
    slot_time TIME NOT NULL UNIQUE,
    slot_label VARCHAR(50) NOT NULL,
    max_capacity INTEGER DEFAULT 2,
    slot_type VARCHAR(20) DEFAULT 'groups',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: adverts
-- Description: Advertisement records with client and scheduling information
-- ============================================
CREATE TABLE adverts (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    category advert_category NOT NULL,
    caption TEXT NOT NULL,
    media_url VARCHAR(500),
    days_paid INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid NUMERIC NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status advert_status NOT NULL DEFAULT 'pending',
    assigned_slot_id INTEGER REFERENCES time_slots(id),
    sales_rep_id INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    remaining_days INTEGER,
    destination_type VARCHAR(20) DEFAULT 'groups',
    commission_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: daily_slot_assignments
-- Description: Daily assignments of adverts to specific time slots
-- ============================================
CREATE TABLE daily_slot_assignments (
    id SERIAL PRIMARY KEY,
    advert_id INTEGER NOT NULL REFERENCES adverts(id) ON DELETE CASCADE,
    slot_id INTEGER NOT NULL REFERENCES time_slots(id),
    assignment_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_id, assignment_date, advert_id)
);

-- ============================================
-- TABLE: admin_actions
-- Description: Audit log of administrative actions on adverts
-- ============================================
CREATE TABLE admin_actions (
    id SERIAL PRIMARY KEY,
    advert_id INTEGER NOT NULL REFERENCES adverts(id) ON DELETE CASCADE,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: invoices
-- Description: Generated invoices for advertisements
-- ============================================
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) NOT NULL UNIQUE,
    advert_id INTEGER NOT NULL UNIQUE REFERENCES adverts(id),
    client_name VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL,
    commission_amount NUMERIC NOT NULL DEFAULT 0,
    sales_rep_id INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'PAID',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VIEW: monthly_sales_rep_commission
-- Description: Monthly commission summary per sales representative
-- ============================================
CREATE OR REPLACE VIEW monthly_sales_rep_commission AS
SELECT 
    u.id AS sales_rep_id,
    u.full_name,
    u.email,
    DATE_TRUNC('month', i.generated_at) AS month,
    COUNT(i.id) AS total_adverts,
    SUM(i.amount) AS total_sales,
    SUM(i.commission_amount) AS total_commission,
    AVG(i.commission_amount) AS avg_commission
FROM users u
JOIN invoices i ON u.id = i.sales_rep_id
GROUP BY u.id, u.full_name, u.email, DATE_TRUNC('month', i.generated_at);

-- ============================================
-- VIEW: current_month_sales_rep_stats
-- Description: Current month statistics per sales representative
-- ============================================
CREATE OR REPLACE VIEW current_month_sales_rep_stats AS
SELECT 
    u.id AS sales_rep_id,
    u.full_name,
    u.email,
    COUNT(a.id) AS total_adverts,
    SUM(a.amount_paid) AS total_sales,
    SUM(a.commission_amount) AS total_commission,
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN a.status = 'active' THEN 1 END) AS active_count,
    COUNT(CASE WHEN a.status = 'expired' THEN 1 END) AS expired_count
FROM users u
LEFT JOIN adverts a ON u.id = a.sales_rep_id 
    AND DATE_TRUNC('month', a.created_at) = DATE_TRUNC('month', CURRENT_DATE)
WHERE u.role = 'sales_rep'
GROUP BY u.id, u.full_name, u.email;

-- ============================================
-- VIEW: invoice_analytics
-- Description: Monthly invoice analytics and metrics
-- ============================================
CREATE OR REPLACE VIEW invoice_analytics AS
SELECT 
    DATE_TRUNC('month', generated_at) AS month,
    COUNT(*) AS total_invoices,
    SUM(amount) AS total_amount,
    SUM(commission_amount) AS total_commission,
    COUNT(DISTINCT sales_rep_id) AS active_reps,
    COUNT(DISTINCT client_name) AS unique_clients,
    AVG(amount) AS avg_invoice_amount
FROM invoices
GROUP BY DATE_TRUNC('month', generated_at);

-- ============================================
-- VIEW: sales_rep_invoice_summary
-- Description: Lifetime invoice summary per sales representative
-- ============================================
CREATE OR REPLACE VIEW sales_rep_invoice_summary AS
SELECT 
    u.id,
    u.full_name,
    u.email,
    COUNT(i.id) AS total_invoices,
    SUM(i.amount) AS total_revenue,
    SUM(i.commission_amount) AS total_commission,
    MAX(i.generated_at) AS last_invoice_date,
    AVG(i.amount) AS avg_invoice_amount
FROM users u
LEFT JOIN invoices i ON u.id = i.sales_rep_id
WHERE u.role = 'sales_rep'
GROUP BY u.id, u.full_name, u.email;

-- ============================================
-- INDEXES
-- ============================================

-- Indexes for users table
CREATE UNIQUE INDEX users_pkey ON users(id);
CREATE UNIQUE INDEX users_email_key ON users(email);

-- Indexes for time_slots table
CREATE UNIQUE INDEX time_slots_pkey ON time_slots(id);
CREATE UNIQUE INDEX time_slots_slot_time_key ON time_slots(slot_time);

-- Indexes for adverts table
CREATE UNIQUE INDEX adverts_pkey ON adverts(id);
CREATE INDEX idx_adverts_assigned_slot ON adverts(assigned_slot_id);
CREATE INDEX idx_adverts_sales_rep ON adverts(sales_rep_id);
CREATE INDEX idx_adverts_start_date ON adverts(start_date);
CREATE INDEX idx_adverts_status ON adverts(status);

-- Indexes for daily_slot_assignments table
CREATE UNIQUE INDEX daily_slot_assignments_pkey ON daily_slot_assignments(id);
CREATE UNIQUE INDEX daily_slot_assignments_slot_id_assignment_date_advert_id_key 
    ON daily_slot_assignments(slot_id, assignment_date, advert_id);
CREATE INDEX idx_daily_assignments_advert ON daily_slot_assignments(advert_id);
CREATE INDEX idx_daily_assignments_date ON daily_slot_assignments(assignment_date);
CREATE INDEX idx_daily_assignments_slot ON daily_slot_assignments(slot_id, assignment_date);
CREATE INDEX idx_daily_slots_destination ON daily_slot_assignments(slot_id, assignment_date);

-- Indexes for admin_actions table
CREATE UNIQUE INDEX admin_actions_pkey ON admin_actions(id);
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_advert ON admin_actions(advert_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);

-- Indexes for invoices table
CREATE UNIQUE INDEX invoices_pkey ON invoices(id);
CREATE UNIQUE INDEX invoices_invoice_number_key ON invoices(invoice_number);
CREATE UNIQUE INDEX invoices_advert_id_key ON invoices(advert_id);
CREATE INDEX idx_invoices_advert_id ON invoices(advert_id);
CREATE INDEX idx_invoices_generated_at ON invoices(generated_at);
CREATE INDEX idx_invoices_sales_rep ON invoices(sales_rep_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'System users including sales representatives and administrators';
COMMENT ON TABLE time_slots IS 'Available time slots for advertisement scheduling';
COMMENT ON TABLE adverts IS 'Advertisement records with client information and scheduling details';
COMMENT ON TABLE daily_slot_assignments IS 'Daily assignments mapping adverts to specific time slots';
COMMENT ON TABLE admin_actions IS 'Audit trail of administrative actions performed on advertisements';
COMMENT ON TABLE invoices IS 'Generated invoices for completed advertisements';

COMMENT ON VIEW monthly_sales_rep_commission IS 'Monthly commission summary aggregated by sales representative';
COMMENT ON VIEW current_month_sales_rep_stats IS 'Current month performance statistics for sales representatives';
COMMENT ON VIEW invoice_analytics IS 'Monthly invoice analytics and business metrics';
COMMENT ON VIEW sales_rep_invoice_summary IS 'Lifetime invoice performance summary per sales representative';