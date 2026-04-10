const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Sale = require('../models/Sale');
const InventoryLog = require('../models/InventoryLog');
const { getInventoryStats } = require('../utils/inventoryService');
const { CacheService, CACHE_KEYS, TTL } = require('../utils/cacheService');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const cacheKey = CACHE_KEYS.DASHBOARD_STATS;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      inventoryStats,
      recentOrders,
      recentSales
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      getInventoryStats(),
      Order.find().sort('-createdAt').limit(5).populate('user', 'name email').lean(),
      Sale.find().sort('-createdAt').limit(5).populate('cashier', 'name').lean()
    ]);

    const totalRevenue = await Sale.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const monthlyRevenue = await Sale.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const weeklyRevenue = await Sale.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      success: true,
      stats: {
        users: {
          total: totalUsers,
          newThisWeek: await User.countDocuments({ createdAt: { $gte: weekAgo } })
        },
        products: {
          total: totalProducts,
          lowStock: inventoryStats.lowStockProducts,
          outOfStock: inventoryStats.outOfStockProducts,
          totalValue: inventoryStats.totalStock[0]?.total || 0
        },
        orders: {
          total: totalOrders,
          pending: orderStats.find(o => o._id === 'pending')?.count || 0,
          processing: orderStats.find(o => o._id === 'processing')?.count || 0,
          shipped: orderStats.find(o => o._id === 'shipped')?.count || 0,
          delivered: orderStats.find(o => o._id === 'delivered')?.count || 0
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0,
          weekly: weeklyRevenue[0]?.total || 0
        },
        recentOrders,
        recentSales
      }
    };

    await CacheService.set(cacheKey, result, TTL.SHORT);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search
    } = req.query;

    const limitNum = Math.min(Number(limit), 100);
    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * limitNum;

    const users = await User.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .select('-password')
      .lean();

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limitNum),
        totalUsers: total
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('wishlist')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [userOrders, userSales] = await Promise.all([
      Order.find({ user: req.params.id }).sort('-createdAt').limit(10).lean(),
      Sale.find({ user: req.params.id }).sort('-createdAt').limit(10).lean()
    ]);

    res.status(200).json({
      success: true,
      user,
      userOrders,
      userSales
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, isActive, phone, address } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive, phone, address },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getInventory = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      search,
      sort = '-stockQuantity'
    } = req.query;

    const limitNum = Math.min(Number(limit), 100);
    const query = { isActive: true };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let allProducts = await Product.find(query)
      .select('name sku stockQuantity lowStockThreshold category price isActive')
      .sort(sort)
      .lean();

    if (status === 'low') {
      allProducts = allProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold);
    } else if (status === 'out') {
      allProducts = allProducts.filter(p => p.stockQuantity === 0);
    } else if (status === 'in') {
      allProducts = allProducts.filter(p => p.stockQuantity > p.lowStockThreshold);
    }

    const total = allProducts.length;
    const skip = (Number(page) - 1) * limitNum;
    const products = allProducts.slice(skip, skip + limitNum);

    const enrichedProducts = products.map(p => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      category: p.category,
      price: p.price,
      isActive: p.isActive,
      status: p.stockQuantity === 0 ? 'out_of_stock' : 
              p.stockQuantity <= p.lowStockThreshold ? 'low_stock' : 'in_stock'
    }));

    res.status(200).json({
      success: true,
      products: enrichedProducts,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limitNum),
        totalProducts: total
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkUpdateStock = async (req, res, next) => {
  try {
    const { updates } = req.body;

    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.productId },
        update: { $inc: { stockQuantity: update.change } }
      }
    }));

    await Product.bulkWrite(bulkOps);

    const updatedProducts = await Product.find({
      _id: { $in: updates.map(u => u.productId) }
    }).select('name sku stockQuantity').lean();

    await CacheService.invalidateProducts();

    res.status(200).json({
      success: true,
      products: updatedProducts,
      message: 'Stock updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getInventoryLogs = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    const limitNum = Math.min(Number(limit), 100);
    const query = {};
    if (productId) {
      query.product = productId;
    }
    if (type) {
      query.changeType = type;
    }

    const skip = (Number(page) - 1) * limitNum;

    const logs = await InventoryLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('product', 'name sku')
      .populate('user', 'name')
      .lean();

    const total = await InventoryLog.countDocuments(query);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limitNum),
        totalLogs: total
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllProductsAdmin = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      status,
      search,
      sort = '-createdAt'
    } = req.query;

    const limitNum = Math.min(Number(limit), 100);
    const query = {};

    if (category) {
      query.category = category.toLowerCase();
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * limitNum;

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('reviews', 'rating')
      .lean();

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limitNum),
        totalProducts: total
      }
    });
  } catch (error) {
    next(error);
  }
};
