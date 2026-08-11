const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const targetController = require('../controllers/targetController');
const { authenticate, isAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/targets/mine
 * @desc    Logged-in rep's own target + attained for a month (default: current)
 * @access  Any authenticated user
 */
router.get('/mine', targetController.getMyTarget);

/**
 * @route   GET /api/targets/company
 * @desc    Company-wide target vs attained, plus per-rep breakdown
 * @access  Admin only
 */
router.get('/company', isAdmin, targetController.getCompanyTarget);

/**
 * @route   GET /api/targets/all
 * @desc    Every sales rep's target + attained for a month — powers the editable targets table
 * @access  Admin only
 */
router.get('/all', isAdmin, targetController.getAllTargets);

/**
 * @route   PUT /api/targets/:userId
 * @desc    Set (upsert) a rep's target for a month
 * @access  Admin only
 */
router.put(
  '/:userId',
  isAdmin,
  [
    body('targetAmount').isFloat({ min: 0 }).withMessage('targetAmount must be a non-negative number'),
    body('month').optional().matches(/^\d{4}-\d{2}(-\d{2})?$/).withMessage('month must be YYYY-MM or YYYY-MM-DD')
  ],
  validate,
  targetController.setTarget
);

module.exports = router;
