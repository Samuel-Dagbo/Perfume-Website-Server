const Coupon = require('../models/Coupon');

exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal, category } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    if (!coupon.isValid()) {
      if (coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({
          success: false,
          message: 'This coupon has reached its usage limit'
        });
      }
      if (new Date() > coupon.validUntil) {
        return res.status(400).json({
          success: false,
          message: 'This coupon has expired'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'This coupon is no longer valid'
      });
    }

    if (subtotal && subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of $${coupon.minOrderAmount} required for this coupon`
      });
    }

    const discount = coupon.calculateDiscount(subtotal || 0, category);

    res.status(200).json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
        description: coupon.description,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create({
      ...req.body,
      code: req.body.code.toUpperCase(),
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      coupon
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }
    next(error);
  }
};

exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find()
      .sort('-createdAt')
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      coupons
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      coupon
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.incrementUsage = async (req, res, next) => {
  try {
    const coupon = await Coupon.findOneAndUpdate(
      { code: req.params.code },
      { $inc: { usedCount: 1 } },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      coupon
    });
  } catch (error) {
    next(error);
  }
};
