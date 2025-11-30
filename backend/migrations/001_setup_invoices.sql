-- Migration to ensure invoices table and views exist
-- Run this in pgAdmin

-- 1. Create invoices table if not exists
CREATE TABLE IF NOT EXISTS invoices (
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

-- 2. Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_advert_id ON invoices(advert_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sales_rep ON invoices(sales_rep_id);

-- 3. Create or Replace Views for Analytics

-- View: monthly_sales_rep_commission
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

-- View: current_month_sales_rep_stats
CREATE OR REPLACE VIEW current_month_sales_rep_stats AS
SELECT 
    u.id AS sales_rep_id,
    u.full_name,
    u.email,
    COUNT(a.id) AS total_adverts,
    SUM(CASE WHEN a.status IN ('active', 'approved') THEN a.amount_paid ELSE 0 END) AS total_sales,
    SUM(CASE WHEN a.status IN ('active', 'approved') THEN a.commission_amount ELSE 0 END) AS total_commission,
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN a.status = 'active' THEN 1 END) AS active_count,
    COUNT(CASE WHEN a.status = 'expired' THEN 1 END) AS expired_count
FROM users u
LEFT JOIN adverts a ON u.id = a.sales_rep_id 
    AND DATE_TRUNC('month', a.created_at) = DATE_TRUNC('month', CURRENT_DATE)
WHERE u.role = 'sales_rep'
GROUP BY u.id, u.full_name, u.email;

-- View: invoice_analytics
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
