const User = require('../models/User');
const Product = require('../models/Product');

exports.addToWishlist = async (req, res, next) => {
  try {
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const user = await User.findById(req.user.id);

    if (user.wishlist.includes(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    user.wishlist.push(productId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      wishlist: user.wishlist
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    const productId = req.params.productId;

    const user = await User.findById(req.user.id);

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      wishlist: user.wishlist
    });
  } catch (error) {
    next(error);
  }
};

exports.getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'wishlist',
        select: 'name price images category stockQuantity ratings'
      });

    res.status(200).json({
      success: true,
      wishlist: user.wishlist
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const { address } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { address },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};
