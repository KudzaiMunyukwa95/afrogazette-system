const pool = require('../config/database');
// Force deploy fix for syntax error

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

        console.log('DEBUG: getFinancialOverview Params:', { startDate, endDate });

        if (startDate) {
            dateFilter += ` AND expense_date >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            dateFilter += ` AND expense_date < $${paramCount}::date + INTERVAL '1 day'`;
            params.push(endDate);
            paramCount++;
        }

        // 1. Total Income (from invoices)
        let invoiceDateFilter = dateFilter.replace(/expense_date/g, 'generated_at');
        const incomeQuery = `
            SELECT COALESCE(SUM(amount), 0) as total_income
            FROM invoices
            WHERE 1=1 ${invoiceDateFilter}
        `;
        const incomeResult = await pool.query(incomeQuery, params);
        const totalIncome = parseFloat(incomeResult.rows[0].total_income);

        // 2. Total Expenses (Approved only)
        const expenseQuery = `
            SELECT COALESCE(SUM(amount), 0) as total_expenses
            FROM expenses
            WHERE status = 'Approved' ${dateFilter}
        `;
        const expenseResult = await pool.query(expenseQuery, params);
        const totalExpenses = parseFloat(expenseResult.rows[0].total_expenses);

        // DEBUG: Find out WHICH expenses are appearing in Jan 2026
        const debugExpenseQuery = `
            SELECT id, reason, amount, expense_date, created_at
            FROM expenses
            WHERE status = 'Approved' ${dateFilter}
        `;
        const debugResult = await pool.query(debugExpenseQuery, params);
        if (debugResult.rows.length > 0) {
            console.log('DEBUG: Expenses found in this period:', debugResult.rows);
        } else {
            console.log('DEBUG: No expenses found for this period (Result is clean)');
        }

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

        // Breakdown by Payment Method
        const paymentMethodQuery = `
            SELECT a.payment_method, COALESCE(SUM(i.amount), 0) as total
            FROM invoices i
            JOIN adverts a ON i.advert_id = a.id
            WHERE 1=1 ${dateFilter}
            GROUP BY a.payment_method
        `;
        const paymentMethodResult = await pool.query(paymentMethodQuery, params);

        // Breakdown by Category
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
            dateFilter += ` AND expense_date >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            dateFilter += ` AND expense_date < $${paramCount}::date + INTERVAL '1 day'`;
            params.push(endDate);
            paramCount++;
        }

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
            SELECT DATE(expense_date) as date, COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE 1=1 ${approvedFilter} ${dateFilter}
            GROUP BY DATE(expense_date)
            ORDER BY DATE(expense_date)
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
 * Note: adverts uses payment_method_enum ('cash', 'ecocash', 'innbucks')
 *       expenses uses payment_method_type ('Cash', 'EcoCash', 'Innbucks')
 */
const getPaymentMethodSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const methods = [
            { advertMethod: 'cash', expenseMethod: 'Cash', display: 'Cash' },
            { advertMethod: 'ecocash', expenseMethod: 'EcoCash', display: 'EcoCash' },
            { advertMethod: 'innbucks', expenseMethod: 'Innbucks', display: 'Innbucks' }
        ];
        const summary = [];

        for (const methodPair of methods) {
            // Income query (uses lowercase for adverts)
            let incomeQuery = `
                SELECT COALESCE(SUM(i.amount), 0) as total
                FROM invoices i
                JOIN adverts a ON i.advert_id = a.id
                WHERE a.payment_method = $1
            `;
            const incomeParams = [methodPair.advertMethod];
            let paramIndex = 2;

            if (startDate) {
                incomeQuery += ` AND i.generated_at >= $${paramIndex}`;
                incomeParams.push(startDate);
                paramIndex++;
            }
            if (endDate) {
                incomeQuery += ` AND i.generated_at < $${paramIndex}::date + INTERVAL '1 day'`;
                incomeParams.push(endDate);
            }

            const incomeResult = await pool.query(incomeQuery, incomeParams);
            const income = parseFloat(incomeResult.rows[0].total);

            // Expense query (uses capitalized for expenses)
            let expenseQuery = `
                SELECT COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE payment_method = $1 AND status = 'Approved'
            `;
            const expenseParams = [methodPair.expenseMethod];
            paramIndex = 2;

            if (startDate) {
                expenseQuery += ` AND expense_date >= $${paramIndex}`;
                expenseParams.push(startDate);
                paramIndex++;
            }
            if (endDate) {
                expenseQuery += ` AND expense_date < $${paramIndex}::date + INTERVAL '1 day'`;
                expenseParams.push(endDate);
            }

            const expenseResult = await pool.query(expenseQuery, expenseParams);
            const expense = parseFloat(expenseResult.rows[0].total);

            summary.push({
                method: methodPair.display,
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
