const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const advertController = require('../controllers/advertController');
const { authenticate, isAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// Valid categories array - UPDATED with all 27 categories
const VALID_CATEGORIES = [
  'automotive', 'bales', 'beauty', 'boreholes', 'building_materials',
  'church', 'clothing', 'company_registration', 'education', 'entertainment',
  'farming', 'fashion', 'finance', 'food_beverage', 'health_wellness',
  'herbs', 'home_garden', 'loans', 'motor', 'phones', 'real_estate',
  'solar', 'sports', 'technology', 'travel', 'vehicle_spares', 'other'
];

/**
 * @route   POST /api/adverts
 * @desc    Create new advert (sales rep)
 * @access  Sales Rep
 */
router.post(
  '/',
  [
    body('clientName').notEmpty().withMessage('Client name is required'),
    body('category')
      .isIn(VALID_CATEGORIES)
      .withMessage('Valid category is required'),
    body('caption').notEmpty().withMessage('Caption is required'),
    body('mediaUrl').optional().isURL().withMessage('Valid URL is required'),
    body('daysPaid')
      .isInt({ min: 1 })
      .withMessage('Days paid must be at least 1'),
    body('paymentDate').isISO8601().withMessage('Valid payment date is required'),
    body('amountPaid')
      .isFloat({ min: 0 })
      .withMessage('Amount paid must be a positive number'),
    body('startDate').isISO8601().withMessage('Valid start date is required')
  ],
  validate,
  advertController.createAdvert
);

/**
 * @route   GET /api/adverts
 * @desc    Get adverts (filtered by role)
 * @access  Sales Rep (own) / Admin (all)
 */
router.get('/', advertController.getAdverts);

/**
 * @route   GET /api/adverts/pending
 * @desc    Get pending adverts
 * @access  Admin only
 */
router.get('/pending', isAdmin, advertController.getPendingAdverts);

/**
 * @route   POST /api/adverts/:id/approve
 * @desc    Approve advert and assign slot
 * @access  Admin only
 */
router.post(
  '/:id/approve',
  isAdmin,
  [
    body('slotId')
      .isInt({ min: 1 })
      .withMessage('Valid slot ID is required')
  ],
  validate,
  advertController.approveAdvert
);

/**
 * @route   POST /api/adverts/:id/decline
 * @desc    Decline advert with reason
 * @access  Admin only
 */
router.post(
  '/:id/decline',
  isAdmin,
  [
    body('reason')
      .notEmpty()
      .withMessage('Decline reason is required')
      .isLength({ min: 10 })
      .withMessage('Reason must be at least 10 characters'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],
  validate,
  // Check if the function exists before using it
  advertController.declineAdvert || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'Decline functionality not yet implemented'
    });
  })
);

/**
 * @route   POST /api/adverts/:id/extend
 * @desc    Extend advert days
 * @access  Admin only
 */
router.post(
  '/:id/extend',
  isAdmin,
  [
    body('additionalDays')
      .isInt({ min: 1 })
      .withMessage('Additional days must be at least 1'),
    body('amountPaid')
      .isFloat({ min: 0 })
      .withMessage('Amount paid must be a positive number')
  ],
  validate,
  advertController.extendAdvert
);

/**
 * @route   GET /api/adverts/:id/history
 * @desc    Get admin action history for advert
 * @access  Admin only
 */
router.get(
  '/:id/history',
  isAdmin,
  // Check if the function exists before using it
  advertController.getAdvertHistory || ((req, res) => {
    res.status(501).json({
      success: false,
      message: 'History functionality not yet implemented'
    });
  })
);

/**
 * @route   PATCH /api/adverts/:id
 * @desc    Update advert
 * @access  Admin only
 */
router.patch('/:id', isAdmin, advertController.updateAdvert);

/**
 * @route   DELETE /api/adverts/:id
 * @desc    Delete advert
 * @access  Sales Rep (own pending) / Admin (any)
 */
router.delete('/:id', advertController.deleteAdvert);

/**
 * @route   DELETE /api/adverts/:id/permanent
 * @desc    Permanently delete advert (admin only)
 * @access  Admin only
 */
router.delete(
  '/:id/permanent',
  isAdmin,
  [
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ],
  validate,
  // Check if the function exists before using it
  advertController.permanentlyDeleteAdvert || advertController.deleteAdvert
);

module.exports = router;
