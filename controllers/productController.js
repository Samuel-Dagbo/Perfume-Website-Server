const Product = require('../models/Product');
const { updateInventory } = require('../utils/inventoryService');

exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      search,
      sort = '-createdAt',
      featured,
      inStock
    } = req.query;

    const query = { isActive: true };

    if (category) {
      query.category = category.toLowerCase();
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$text = { $search: search };
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    if (inStock === 'true') {
      query.stockQuantity = { $gt: 0 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select('-reviews.user');

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalProducts: total,
        hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
        hasPrevPage: Number(page) > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'name avatar');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    product.reviews.push({
      user: req.user.id,
      rating,
      comment
    });

    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.ratings.average = totalRating / product.reviews.length;
    product.ratings.count = product.reviews.length;

    await product.save();

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

exports.getRelatedProducts = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      isActive: true
    }).limit(4);

    res.status(200).json({
      success: true,
      products: relatedProducts
    });
  } catch (error) {
    next(error);
  }
};

exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      isFeatured: true,
      isActive: true,
      stockQuantity: { $gt: 0 }
    })
    .sort('-createdAt')
    .limit(8);

    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    next(error);
  }
};

exports.searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;

    const products = await Product.find({
      $text: { $search: q },
      isActive: true
    }).limit(20);

    res.status(200).json({
      success: true,
      products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStock = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    await updateInventory({
      productId: req.params.id,
      quantityChange: quantity - (await Product.findById(req.params.id)).stockQuantity,
      changeType: 'manual_adjustment',
      reason: req.body.reason || 'Manual stock update',
      userId: req.user.id
    });

    const product = await Product.findById(req.params.id);

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};
