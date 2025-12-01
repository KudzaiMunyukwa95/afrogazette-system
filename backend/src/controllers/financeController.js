const pool = require('../config/database');

/**
 * Get Financial Overview (KPIs)
 */
const getFinancialOverview = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Base date filter
        let dateFilter = '';
        const params = [];
        let paramCount = 1;

        if (startDate) {
            dateFilter += ` AND created_at >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            dateFilter += ` AND created_at < $${paramCount}::date + INTERVAL '1 day'`;
            params.push(endDate);
            paramCount++;
        }

        // 1. Total Income (from invoices)
        // Note: Using generated_at for invoices as the date reference
        let invoiceDateFilter = dateFilter.replace(/created_at/g, 'generated_at');
        const incomeQuery = `
            SELECT COALESCE(SUM(amount), 0) as total_income
            FROM invoices
            WHERE 1=1 ${invoiceDateFilter}
        `;
        const incomeResult = await pool.query(incomeQuery, params);
        const totalIncome = parseFloat(incomeResult.rows[0].total_income);

        // 2. Total Expenses (Approved only)
        // Note: Using approved_at for expenses as the date reference for financial reporting
        // Or should we use created_at? Usually financial reports use the date the expense was incurred/approved.
        // Let's use created_at for consistency with the filter, but only count Approved expenses.
        const expenseQuery = `
            SELECT COALESCE(SUM(amount), 0) as total_expenses
            FROM expenses
            WHERE status = 'Approved' ${dateFilter}
        `;
        const expenseResult = await pool.query(expenseQuery, params);
        const totalExpenses = parseFloat(expenseResult.rows[0].total_expenses);

        // 3. Pending Items
        const pendingQuery = `
            SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
            FROM expenses
            WHERE status = 'Pending' ${dateFilter}
        `;
        const pendingResult = await pool.query(pendingQuery, params);

        // 4. Payment Method Breakdown (Expenses)
        const paymentMethodQuery = `
            SELECT payment_method, COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE status = 'Approved' ${dateFilter}
            GROUP BY payment_method
        `;
        const paymentMethodResult = await pool.query(paymentMethodQuery, params);

        // Calculate Net Position
        const netPosition = totalIncome - totalExpenses;
        const margin = totalIncome > 0 ? (netPosition / totalIncome) * 100 : 0;

        res.json({
            success: true,
            data: {
                totalIncome,
                totalExpenses,
                netPosition,
                margin: parseFloat(margin.toFixed(2)),
                pending: {
                    count: parseInt(pendingResult.rows[0].count),
                    amount: parseFloat(pendingResult.rows[0].total_amount)
                },
                paymentMethods: paymentMethodResult.rows
            }
        });
    } catch (error) {
        console.error('Get financial overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching financial overview'
        });
    }
};

/**
 * Get Income Breakdown
 */
const getIncomeBreakdown = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = '';
        const params = [];
        let paramCount = 1;

        if (startDate) {
            dateFilter += ` AND i.generated_at >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            dateFilter += ` AND i.generated_at < $${paramCount}::date + INTERVAL '1 day'`;
            params.push(endDate);
            paramCount++;
        }

        // Breakdown by Payment Method (from adverts linked to invoices)
        const paymentMethodQuery = `
            SELECT a.payment_method, COALESCE(SUM(i.amount), 0) as total
            FROM invoices i
            JOIN adverts a ON i.advert_id = a.id
            WHERE 1=1 ${dateFilter}
            GROUP BY a.payment_method
        `;
        const paymentMethodResult = await pool.query(paymentMethodQuery, params);

        // Breakdown by Advert Type (if available in adverts table, assuming 'category' or similar)
        const typeQuery = `
            SELECT a.category, COALESCE(SUM(i.amount), 0) as total
            FROM invoices i
            JOIN adverts a ON i.advert_id = a.id
            WHERE 1=1 ${dateFilter}
            GROUP BY a.category
        `;
        const typeResult = await pool.query(typeQuery, params);

        // Time Series (Daily)
        const timeSeriesQuery = `
            SELECT DATE(i.generated_at) as date, COALESCE(SUM(i.amount), 0) as total
            FROM invoices i
            WHERE 1=1 ${dateFilter}
            GROUP BY DATE(i.generated_at)
            ORDER BY DATE(i.generated_at)
        `;
        const timeSeriesResult = await pool.query(timeSeriesQuery, params);

        res.json({
            success: true,
            data: {
                byPaymentMethod: paymentMethodResult.rows,
                byCategory: typeResult.rows,
                timeSeries: timeSeriesResult.rows
            }
        });
    } catch (error) {
        console.error('Get income breakdown error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching income breakdown'
        });
    }
};

/**
 * Get Expense Breakdown
 */
const getExpenseBreakdown = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = '';
        const params = [];
        let paramCount = 1;

        if (startDate) {
            dateFilter += ` AND created_at >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            dateFilter += ` AND created_at < $${paramCount}::date + INTERVAL '1 day'`;
            params.push(endDate);
            paramCount++;
        }

        // Only approved expenses count
        const approvedFilter = " AND status = 'Approved'";

        // Breakdown by Category
        const categoryQuery = `
            SELECT category, COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE 1=1 ${approvedFilter} ${dateFilter}
            GROUP BY category
        `;
        const categoryResult = await pool.query(categoryQuery, params);

        // Breakdown by Payment Method
        const paymentMethodQuery = `
            SELECT payment_method, COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE 1=1 ${approvedFilter} ${dateFilter}
            GROUP BY payment_method
        `;
        const paymentMethodResult = await pool.query(paymentMethodQuery, params);

        // Time Series (Daily)
        const timeSeriesQuery = `
            SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE 1=1 ${approvedFilter} ${dateFilter}
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        `;
        const timeSeriesResult = await pool.query(timeSeriesQuery, params);

        res.json({
            success: true,
            data: {
                byCategory: categoryResult.rows,
                byPaymentMethod: paymentMethodResult.rows,
                timeSeries: timeSeriesResult.rows
            }
        });
    } catch (error) {
        console.error('Get expense breakdown error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching expense breakdown'
        });
    }
};

/**
 * Get Payment Method Summary (Income vs Expense vs Net)
 */
const getPaymentMethodSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = '';
        let invoiceDateFilter = '';
        const params = [];
        let paramCount = 1;

        if (startDate) {
            dateFilter += ` AND created_at >= $${paramCount}`;
            invoiceDateFilter += ` AND i.generated_at >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            dateFilter += ` AND created_at < $${paramCount}::date + INTERVAL '1 day'`;
            invoiceDateFilter += ` AND i.generated_at < $${paramCount}::date + INTERVAL '1 day'`;
            params.push(endDate);
            paramCount++;
        }

        const methods = ['cash', 'ecocash', 'innbucks'];
        const summary = [];

        for (const method of methods) {
            // Income for this method
            // Note: Adverts table has payment_method, linked to invoices
            // We need to handle case sensitivity or enum matching if needed. 
            // Assuming string match for now based on enum.
            const incomeQuery = `
                SELECT COALESCE(SUM(i.amount), 0) as total
                FROM invoices i
                JOIN adverts a ON i.advert_id = a.id
                WHERE a.payment_method = $${paramCount} ${invoiceDateFilter}
            `;
            const incomeResult = await pool.query(incomeQuery, [...params, method]);
            const income = parseFloat(incomeResult.rows[0].total);

            // Expense for this method
            const expenseQuery = `
                SELECT COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE payment_method = $${paramCount} AND status = 'Approved' ${dateFilter}
            `;
            const expenseResult = await pool.query(expenseQuery, [...params, method]);
            const expense = parseFloat(expenseResult.rows[0].total);

            summary.push({
                method,
                income,
                expense,
                net: income - expense
            });
        }

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Get payment method summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching payment method summary'
        });
    }
};

module.exports = {
    getFinancialOverview,
    getIncomeBreakdown,
    getExpenseBreakdown,
    getPaymentMethodSummary
};
