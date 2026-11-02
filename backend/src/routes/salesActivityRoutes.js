const express = require('express');
const router = express.Router();
const controller = require('../controllers/salesActivityController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require authentication. Reps are pinned to their own data inside
// the controller; the admin-only routes below are the manager views.
router.use(authenticate);

/**
 * Fixed paths first so Express doesn't match them as /:id.
 */

// Dropdown lists (everyone reads; admins edit)
router.get('/options', controller.getOptions);
router.post('/options', isAdmin, controller.createOption);
router.put('/options/:id', isAdmin, controller.updateOption);

// Targets and settings (admin)
router.get('/settings', isAdmin, controller.getSettings);
router.put('/settings', isAdmin, controller.updateSettings);
router.put('/settings/targets/:userId', isAdmin, controller.setRepTarget);

// Rep experience
router.get('/progress', controller.getProgress);
router.get('/follow-ups', controller.getTodayFollowUps);
router.get('/client-context', controller.getClientContext);
router.post('/prospects', controller.createProspect);

// Manager dashboard (admin)
router.get('/summary', isAdmin, controller.getSummary);
router.get('/export', isAdmin, controller.exportActivities);

// Activities
router.get('/', controller.getActivities);
router.post('/', controller.createActivity);
router.get('/:id', controller.getActivityById);
router.put('/:id', controller.updateActivity);
router.post('/:id/withdraw', controller.withdrawActivity);

module.exports = router;
