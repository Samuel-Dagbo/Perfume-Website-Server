const Product = require('../models/Product');
const { updateInventory } = require('../utils/inventoryService');
const { CacheService, CACHE_KEYS, TTL } = require('../utils/cacheService');

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

    const limitNum = Math.min(Number(limit), 50);

    const cacheKey = `products:list:${page}:${limitNum}:${category}:${minPrice}:${maxPrice}:${search}:${sort}:${featured}:${inStock}`;
    const cached = await CacheService.get(cacheKey);
    if (cached && !search) {
      return res.status(200).json(cached);
    }

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

    const skip = (Number(page) - 1) * limitNum;

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-reviews.user')
      .lean();

    const total = await Product.countDocuments(query);

    const result = {
      success: true,
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limitNum),
        totalProducts: total,
        hasNextPage: Number(page) < Math.ceil(total / limitNum),
        hasPrevPage: Number(page) > 1
      }
    };

    if (!search) {
      await CacheService.set(cacheKey, result, TTL.MEDIUM);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const cacheKey = CACHE_KEYS.PRODUCT_DETAIL(id);
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const product = await Product.findById(id)
      .populate('reviews.user', 'name avatar')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const result = {
      success: true,
      product
    };

    await CacheService.set(cacheKey, result, TTL.MEDIUM);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    await CacheService.invalidateProducts();

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

    await CacheService.invalidateProducts();
    await CacheService.del(CACHE_KEYS.PRODUCT_DETAIL(req.params.id));

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

    await CacheService.invalidateProducts();
    await CacheService.del(CACHE_KEYS.PRODUCT_DETAIL(req.params.id));

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

    await CacheService.del(CACHE_KEYS.PRODUCT_DETAIL(productId));

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
    }).limit(4).lean();

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
    const cacheKey = CACHE_KEYS.FEATURED_PRODUCTS;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const products = await Product.find({
      isFeatured: true,
      isActive: true,
      stockQuantity: { $gt: 0 }
    })
    .sort('-createdAt')
    .limit(8)
    .lean();

    const result = {
      success: true,
      products
    };

    await CacheService.set(cacheKey, result, TTL.LONG);

    res.status(200).json(result);
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
    }).limit(20).lean();

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

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await updateInventory({
      productId: req.params.id,
      quantityChange: quantity - product.stockQuantity,
      changeType: 'manual_adjustment',
      reason: req.body.reason || 'Manual stock update',
      userId: req.user.id
    });

    const updatedProduct = await Product.findById(req.params.id);

    await CacheService.invalidateProducts();
    await CacheService.del(CACHE_KEYS.PRODUCT_DETAIL(req.params.id));

    res.status(200).json({
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};
