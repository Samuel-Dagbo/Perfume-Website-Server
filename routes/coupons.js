const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const couponController = require('../controllers/couponController');
const { protect, admin } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

router.post('/validate', [
  body('code').trim().notEmpty().withMessage('Coupon code is required')
], validateRequest, couponController.validateCoupon);

router.get('/', protect, admin, couponController.getCoupons);

router.post('/', protect, admin, [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discountValue').isNumeric().withMessage('Discount value must be a number'),
  body('validUntil').isISO8601().withMessage('Valid until date is required')
], validateRequest, couponController.createCoupon);

router.put('/:id', protect, admin, couponController.updateCoupon);

router.delete('/:id', protect, admin, couponController.deleteCoupon);

router.post('/:code/increment', protect, couponController.incrementUsage);

module.exports = router;
