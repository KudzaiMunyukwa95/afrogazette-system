const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

// All routes require authentication
router.use(verifyToken);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

module.exports = router;
