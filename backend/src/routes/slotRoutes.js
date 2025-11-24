const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/slots
 * @desc    Get all time slots
 * @access  Private
 */
router.get('/', slotController.getAllSlots);

/**
 * @route   GET /api/slots/today
 * @desc    Get today's schedule
 * @access  Private
 */
router.get('/today', slotController.getTodaySchedule);

/**
 * @route   GET /api/slots/calendar
 * @desc    Get schedule for specific date
 * @query   date (YYYY-MM-DD)
 * @access  Private
 */
router.get('/calendar', slotController.getCalendarSchedule);

/**
 * @route   GET /api/slots/vacant
 * @desc    Get vacant slots for date range
 * @query   startDate, endDate (YYYY-MM-DD)
 * @access  Private
 */
router.get('/vacant', slotController.getVacantSlots);

/**
 * @route   GET /api/slots/check-availability
 * @desc    Check slot availability for specific advert
 * @query   advertId, slotId
 * @access  Private
 */
router.get('/check-availability', slotController.checkSlotAvailability);

module.exports = router;
