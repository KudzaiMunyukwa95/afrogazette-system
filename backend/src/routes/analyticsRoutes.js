const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get admin dashboard analytics
 * @access  Admin only
 */
router.get('/dashboard', isAdmin, analyticsController.getDashboard);

/**
 * @route   GET /api/analytics/my-dashboard
 * @desc    Get sales rep dashboard (current month)
 * @access  Sales Rep
 */
router.get('/my-dashboard', analyticsController.getMyDashboard);

/**
 * @route   GET /api/analytics/monthly-report
 * @desc    Get monthly performance report
 * @access  Admin only
 */
router.get(
  '/monthly-report', 
  isAdmin, 
  analyticsController.getMonthlyReport || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'Monthly report feature not yet implemented'
    });
  })
);

module.exports = router;
