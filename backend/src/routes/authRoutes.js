const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.login
);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public (should be restricted in production)
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('role')
      .optional()
      .isIn(['admin', 'sales_rep'])
      .withMessage('Role must be admin or sales_rep')
  ],
  validate,
  authController.register
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
