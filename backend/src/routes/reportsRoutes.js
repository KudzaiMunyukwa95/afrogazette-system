const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All routes require authentication. Scoping (own data vs company-wide) is
// handled inside each controller via resolveRepScope — sales reps always
// get their own numbers, admins get company-wide with an optional ?repId=.
router.use(authenticate);

router.get('/realtime', reportsController.getRealtimeSnapshot);
router.get('/flight-mix', reportsController.getFlightMix);
router.get('/occupancy', reportsController.getOccupancy);
router.get('/retention', reportsController.getRetention);
router.get('/margin', reportsController.getMargin);
router.get('/target-history', reportsController.getTargetHistory);
router.get('/competitors', reportsController.getCompetitorMentions);

router.post(
  '/competitors',
  [
    body('competitorName').notEmpty().withMessage('Competitor name is required'),
    body('competitorPrice').optional().isFloat({ min: 0 }).withMessage('Competitor price must be a positive number')
  ],
  validate,
  reportsController.createCompetitorMention
);

module.exports = router;
