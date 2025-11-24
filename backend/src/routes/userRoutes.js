const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All user routes require authentication and admin role
router.use(authenticate, isAdmin);

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Admin only
 */
router.get('/', userController.getAllUsers);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Admin only
 */
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('role')
      .isIn(['admin', 'sales_rep'])
      .withMessage('Role must be admin or sales_rep')
  ],
  validate,
  userController.createUser
);

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user
 * @access  Admin only
 */
router.patch(
  '/:id',
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
    body('role')
      .optional()
      .isIn(['admin', 'sales_rep'])
      .withMessage('Role must be admin or sales_rep')
  ],
  validate,
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;
