const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { FLIGHTS, PRICES, BOTH_PRICES } = require('../config/ratePolicy');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/rates
 * @desc    Current rate card (flights, per-destination prices, both-bundle prices) —
 *          the frontend renders pricing from this instead of hardcoding it, so a
 *          rate change only ever happens in one place: config/ratePolicy.js
 * @access  Any authenticated user
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: { flights: FLIGHTS, prices: PRICES, bothPrices: BOTH_PRICES }
  });
});

module.exports = router;
