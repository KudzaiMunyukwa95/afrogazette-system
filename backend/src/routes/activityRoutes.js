const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Admin-only — this is an audit trail of admin decisions.
router.use(authenticate, isAdmin);

router.get('/', activityController.getActivityLog);

module.exports = router;
