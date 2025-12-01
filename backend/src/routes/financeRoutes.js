const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isSalesRep } = require('../middleware/auth');
const {
    createExpense,
    createRequisition,
    getExpenses,
    getExpenseById,
    approveExpense,
    rejectExpense,
    getExpenseHistory
} = require('../controllers/expenseController');
const {
    getFinancialOverview,
    getIncomeBreakdown,
    getExpenseBreakdown,
    getPaymentMethodSummary
} = require('../controllers/financeController');
const { downloadFinancialReport } = require('../controllers/financePDFController');

// --- EXPENSE MANAGEMENT ---

// Create Expense (Admin: Direct Expense)
router.post('/expenses', authenticate, isAdmin, createExpense);

// Create Requisition (Sales Rep)
// Note: Sales reps can create requisitions. Admins can technically use this too if they want to create a "request" instead of direct expense.
router.post('/requisitions', authenticate, createRequisition);

// Get Expenses / Requisitions
// Admin sees all, Sales Rep sees own
router.get('/expenses', authenticate, getExpenses);

// Get Single Expense Details
router.get('/expenses/:id', authenticate, getExpenseById);

// Approve Expense (Admin only)
router.put('/expenses/:id/approve', authenticate, isAdmin, approveExpense);

// Reject Expense (Admin only)
router.put('/expenses/:id/reject', authenticate, isAdmin, rejectExpense);

// Get Expense History
router.get('/expenses/:id/history', authenticate, getExpenseHistory);


// --- FINANCIAL REPORTING (Admin Only) ---

// Financial Overview (KPIs)
router.get('/reports/overview', authenticate, isAdmin, getFinancialOverview);

// Income Breakdown
router.get('/reports/income', authenticate, isAdmin, getIncomeBreakdown);

// Expense Breakdown
router.get('/reports/expenses', authenticate, isAdmin, getExpenseBreakdown);

// Payment Method Summary
router.get('/reports/payment-methods', authenticate, isAdmin, getPaymentMethodSummary);

// Download PDF Report
router.get('/reports/download-pdf', authenticate, isAdmin, downloadFinancialReport);

module.exports = router;
