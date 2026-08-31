const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/invoices/verify/:invoiceNumber
 * @desc    Public invoice verification, linked from the QR code on the PDF
 * @access  Public
 */
router.get('/verify/:invoiceNumber', invoiceController.verifyInvoice);

// All other routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/invoices
 * @desc    Get all invoices (Admin) or My Invoices (Sales Rep)
 * @access  Private
 */
router.get('/', invoiceController.getInvoices);

/**
 * @route   GET /api/invoices/:id/download
 * @desc    Download invoice PDF
 * @access  Private
 */
router.get('/:id/download', invoiceController.downloadInvoice);

module.exports = router;
