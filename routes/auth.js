const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const validateRequest = require('../middleware/validateRequest');

router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], validateRequest, authController.signup);

router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, authController.login);

router.get('/me', protect, authController.getMe);

router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please enter a valid email')
], validateRequest, authController.forgotPassword);

router.post('/reset-password/:resetToken', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], validateRequest, authController.resetPassword);

router.put('/profile', protect, authController.updateProfile);

router.put('/password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], validateRequest, authController.updatePassword);

router.post('/logout', protect, authController.logout);

module.exports = router;
