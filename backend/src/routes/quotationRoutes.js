const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

/**
 * @route   POST /api/quotations/generate
 * @desc    Generate a quotation PDF on the spot — nothing is persisted
 * @access  Private (any authenticated user)
 */
router.post('/generate', quotationController.generateQuotation);

module.exports = router;
