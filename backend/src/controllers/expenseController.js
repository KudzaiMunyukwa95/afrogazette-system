const pool = require('../config/database');

/**
 * Create a new expense (Admin Direct Expense)
 */
const createExpense = async (req, res) => {
    const client = await pool.connect();
    try {
        const { reason, amount, payment_method, details, category } = req.body;
        const raised_by_user_id = req.user.id;

        await client.query('BEGIN');

        // Create expense record
        const expenseResult = await client.query(
            `INSERT INTO expenses 
            (reason, amount, payment_method, details, category, type, status, raised_by_user_id) 
            VALUES ($1, $2, $3, $4, $5, 'DirectExpense', 'Pending', $6) 
            RETURNING *`,
            [reason, amount, payment_method, details, category, raised_by_user_id]
        );

        const expense = expenseResult.rows[0];

        // Log to history
        await client.query(
            `INSERT INTO expense_status_history 
            (expense_id, new_status, changed_by_user_id, comment) 
            VALUES ($1, 'Pending', $2, 'Direct Expense Created')`,
            [expense.id, raised_by_user_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            data: expense
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create expense error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating expense',
            error: error.message // Expose error for debugging
        });
    } finally {
        client.release();
    }
};

/**
 * Create a new requisition (Sales Rep)
 */
const createRequisition = async (req, res) => {
    const client = await pool.connect();
    try {
        const { reason, amount, payment_method, details, category } = req.body;
        const raised_by_user_id = req.user.id;

        await client.query('BEGIN');

        // Create requisition record
        const expenseResult = await client.query(
            `INSERT INTO expenses 
            (reason, amount, payment_method, details, category, type, status, raised_by_user_id) 
            VALUES ($1, $2, $3, $4, $5, 'Requisition', 'Pending', $6) 
            RETURNING *`,
            [reason, amount, payment_method, details, category, raised_by_user_id]
        );

        const expense = expenseResult.rows[0];

        // Log to history
        await client.query(
            `INSERT INTO expense_status_history 
            (expense_id, new_status, changed_by_user_id, comment) 
            VALUES ($1, 'Pending', $2, 'Requisition Created')`,
            [expense.id, raised_by_user_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Requisition submitted successfully',
            data: expense
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create requisition error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating requisition',
            error: error.message // Expose error for debugging
        });
    } finally {
        client.release();
    }
};

/**
 * Get expenses with filters
 */
const getExpenses = async (req, res) => {
    try {
        const { status, payment_method, startDate, endDate, type } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;

        console.log('🔍 GET /expenses Request:', {
            query: req.query,
            userId,
            userRole
        });

        let query = `
            SELECT e.*, 
                   u_raised.full_name as raised_by_name,
                   u_approved.full_name as approved_by_name
            FROM expenses e
            JOIN users u_raised ON e.raised_by_user_id = u_raised.id
            LEFT JOIN users u_approved ON e.approved_by_user_id = u_approved.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        // Role-based filtering
        if (userRole === 'sales_rep') {
            // Sales reps only see their own requisitions
            query += ` AND e.raised_by_user_id = $${paramCount}`;
            params.push(userId);
            paramCount++;
        }

        // Apply filters
        if (status) {
            query += ` AND e.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (payment_method) {
            query += ` AND e.payment_method = $${paramCount}`;
            params.push(payment_method);
            paramCount++;
        }

        if (type) {
            query += ` AND e.type = $${paramCount}`;
            params.push(type);
            paramCount++;
        }

        if (startDate) {
            query += ` AND e.created_at >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }

        if (endDate) {
            // Add one day to include the end date fully
            query += ` AND e.created_at < $${paramCount}::date + INTERVAL '1 day'`;
            params.push(endDate);
            paramCount++;
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;

        // Get total count first
        const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as count_table`, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY e.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        console.log(`✅ Found ${result.rows.length} expenses matching criteria (Page ${page})`);

        res.json({
            success: true,
            data: {
                expenses: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching expenses'
        });
    }
};

/**
 * Get single expense details
 */
const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT e.*, 
                   u_raised.full_name as raised_by_name,
                   u_approved.full_name as approved_by_name
            FROM expenses e
            JOIN users u_raised ON e.raised_by_user_id = u_raised.id
            LEFT JOIN users u_approved ON e.approved_by_user_id = u_approved.id
            WHERE e.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        const expense = result.rows[0];

        // Check permission for sales reps
        if (req.user.role === 'sales_rep' && expense.raised_by_user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({
            success: true,
            data: expense
        });
    } catch (error) {
        console.error('Get expense details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching expense details'
        });
    }
};

/**
 * Approve expense/requisition
 */
const approveExpense = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const approverId = req.user.id;

        await client.query('BEGIN');

        // Check if expense exists and is pending
        const checkResult = await client.query('SELECT * FROM expenses WHERE id = $1', [id]);

        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        const expense = checkResult.rows[0];

        if (expense.status !== 'Pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Expense is not pending' });
        }

        // Validate: Approver cannot be the raiser
        if (expense.raised_by_user_id === approverId) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                message: 'You cannot approve your own expense/requisition'
            });
        }

        // Update status
        const updateResult = await client.query(
            `UPDATE expenses 
            SET status = 'Approved', approved_by_user_id = $1, approved_at = CURRENT_TIMESTAMP 
            WHERE id = $2 
            RETURNING *`,
            [approverId, id]
        );

        // Log to history
        await client.query(
            `INSERT INTO expense_status_history 
            (expense_id, old_status, new_status, changed_by_user_id, comment) 
            VALUES ($1, 'Pending', 'Approved', $2, 'Approved by Admin')`,
            [id, approverId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Expense approved successfully',
            data: updateResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Approve expense error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error approving expense'
        });
    } finally {
        client.release();
    }
};

/**
 * Reject expense/requisition
 */
const rejectExpense = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const rejectorId = req.user.id;

        await client.query('BEGIN');

        // Check if expense exists and is pending
        const checkResult = await client.query('SELECT * FROM expenses WHERE id = $1', [id]);

        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        const expense = checkResult.rows[0];

        if (expense.status !== 'Pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Expense is not pending' });
        }

        // Update status
        const updateResult = await client.query(
            `UPDATE expenses 
            SET status = 'Rejected', rejection_comment = $1 
            WHERE id = $2 
            RETURNING *`,
            [comment, id]
        );

        // Log to history
        await client.query(
            `INSERT INTO expense_status_history 
            (expense_id, old_status, new_status, changed_by_user_id, comment) 
            VALUES ($1, 'Pending', 'Rejected', $2, $3)`,
            [id, rejectorId, comment]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Expense rejected successfully',
            data: updateResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Reject expense error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error rejecting expense'
        });
    } finally {
        client.release();
    }
};

/**
 * Get expense history
 */
const getExpenseHistory = async (req, res) => {
    try {
        const { id } = req.params;

        // First check access rights
        const expenseCheck = await pool.query('SELECT raised_by_user_id FROM expenses WHERE id = $1', [id]);
        if (expenseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        if (req.user.role === 'sales_rep' && expenseCheck.rows[0].raised_by_user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const result = await pool.query(
            `SELECT h.*, u.full_name as changed_by_name
            FROM expense_status_history h
            JOIN users u ON h.changed_by_user_id = u.id
            WHERE h.expense_id = $1
            ORDER BY h.created_at DESC`,
            [id]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get expense history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching expense history'
        });
    }
};

/**
 * Delete Expense (Super Admin Only)
 */
const deleteExpense = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Delete history first (foreign key constraint)
        await client.query('DELETE FROM expense_status_history WHERE expense_id = $1', [id]);

        // Delete the expense
        const result = await client.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Expense deleted successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete expense error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting expense'
        });
    } finally {
        client.release();
    }
};

module.exports = {
    createExpense,
    createRequisition,
    getExpenses,
    getExpenseById,
    approveExpense,
    rejectExpense,
    getExpenseHistory,
    deleteExpense
};
