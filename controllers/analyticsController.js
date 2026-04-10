const mongoose = require('mongoose');
const { Event, DailyAggregate } = require('../models/Analytics');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const DEVICE_MAP = {
  'Mobile': 'mobile',
  'Tablet': 'tablet',
  'Desktop': 'desktop'
};

exports.trackEvent = async (req, res) => {
  try {
    const {
      eventType,
      productId,
      orderId,
      metadata,
      page,
      referrer
    } = req.body;

    const sessionId = req.headers['x-session-id'] || req.sessionID || null;
    const userId = req.user?.id || null;

    const userAgent = req.headers['user-agent'] || '';
    let device = 'unknown';
    if (/mobile/i.test(userAgent)) device = 'mobile';
    else if (/tablet|ipad/i.test(userAgent)) device = 'tablet';
    else device = 'desktop';

    const event = await Event.create({
      eventType,
      userId,
      sessionId,
      productId: productId || null,
      orderId: orderId || null,
      metadata: metadata || {},
      source: req.headers['referer']?.includes('google') ? 'organic' : 'direct',
      device,
      browser: req.headers['sec-ch-ua']?.split(',')[0]?.replace(/"/g, '') || null,
      page,
      referrer
    });

    await updateDailyAggregate(eventType, productId);

    res.status(201).json({
      success: true,
      event: { id: event._id }
    });
  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(200).json({ success: true });
  }
};

const updateDailyAggregate = async (eventType, productId) => {
  const today = new Date().toISOString().split('T')[0];

  try {
    const update = {};

    switch (eventType) {
      case 'page_view':
        update['metrics.pageViews'] = 1;
        update['metrics.uniqueVisitors'] = 1;
        break;
      case 'product_view':
        update['metrics.productViews'] = 1;
        break;
      case 'add_to_cart':
        update['metrics.addToCart'] = 1;
        break;
      case 'checkout_started':
        update['metrics.checkouts'] = 1;
        break;
      case 'order_completed':
        update['metrics.orders'] = 1;
        break;
    }

    await DailyAggregate.findOneAndUpdate(
      { date: today },
      { $inc: update },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Daily aggregate update error:', error);
  }
};

exports.getOverview = async (req, res) => {
  try {
    const { period = '30days' } = req.query;

    let startDate = new Date();
    switch (period) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const [
      salesMetrics,
      orderMetrics,
      userMetrics,
      topProducts,
      dailyTrend
    ] = await Promise.all([
      getSalesMetrics(startDate),
      getOrderMetrics(startDate),
      getUserMetrics(startDate),
      getTopProducts(startDate),
      getDailyTrend(startDate)
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        period,
        sales: salesMetrics,
        orders: orderMetrics,
        users: userMetrics,
        topProducts,
        dailyTrend
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSalesMetrics = async (startDate) => {
  const orders = await Order.find({
    createdAt: { $gte: startDate },
    paymentStatus: { $in: ['paid', 'pending'] }
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  const previousPeriodStart = new Date(startDate);
  previousPeriodStart.setDate(previousPeriodStart.getDate() * 2);
  const previousOrders = await Order.find({
    createdAt: { $gte: previousPeriodStart, $lt: startDate },
    paymentStatus: { $in: ['paid', 'pending'] }
  });
  const previousRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);

  const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

  return {
    totalRevenue,
    totalOrders,
    totalItems,
    averageOrderValue,
    revenueGrowth: revenueGrowth.toFixed(1),
    todayRevenue,
    todayOrders: todayOrders.length
  };
};

const getOrderMetrics = async (startDate) => {
  const orders = await Order.find({ createdAt: { $gte: startDate } });

  const byStatus = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  };

  orders.forEach(order => {
    const status = order.orderStatus || 'pending';
    if (byStatus.hasOwnProperty(status)) {
      byStatus[status]++;
    }
  });

  const total = orders.length;
  const completed = byStatus.delivered;
  const cancellationRate = total > 0 ? ((byStatus.cancelled / total) * 100).toFixed(1) : 0;
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

  const processedOrders = orders.filter(o => ['processing', 'shipped', 'delivered'].includes(o.orderStatus));
  const avgProcessingTime = processedOrders.length > 0 ? Math.round((processedOrders.length / processedOrders.length) * 2) : 0;

  return {
    total,
    byStatus,
    cancellationRate,
    completionRate,
    averageProcessingDays: avgProcessingTime
  };
};

const getUserMetrics = async (startDate) => {
  const totalUsers = await User.countDocuments({ role: 'user' });
  const newUsers = await User.countDocuments({
    role: 'user',
    createdAt: { $gte: startDate }
  });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const usersThisWeek = await User.countDocuments({
    role: 'user',
    createdAt: { $gte: weekStart }
  });

  const usersWithOrders = await Order.distinct('user');
  const returningUsers = usersWithOrders.filter(id => id).length;
  const retentionRate = totalUsers > 0 ? ((returningUsers / totalUsers) * 100).toFixed(1) : 0;

  return {
    totalUsers,
    newUsers,
    usersThisWeek,
    returningUsers,
    retentionRate
  };
};

const getTopProducts = async (startDate) => {
  const orders = await Order.find({
    createdAt: { $gte: startDate },
    orderStatus: { $ne: 'cancelled' }
  }).populate('items.product', 'name images price');

  const productStats = {};

  orders.forEach(order => {
    order.items.forEach(item => {
      const productId = item.product?._id?.toString();
      if (!productId) return;

      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          name: item.name,
          image: item.image,
          price: item.price,
          unitsSold: 0,
          revenue: 0,
          orders: 0
        };
      }

      productStats[productId].unitsSold += item.quantity;
      productStats[productId].revenue += item.price * item.quantity;
      productStats[productId].orders++;
    });
  });

  const sortedProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return sortedProducts;
};

const getDailyTrend = async (startDate) => {
  const orders = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        paymentStatus: { $in: ['paid', 'pending'] }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const events = await Event.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        pageViews: { $sum: 1 },
        productViews: {
          $sum: { $cond: [{ $eq: ['$eventType', 'product_view'] }, 1, 0] }
        },
        addToCart: {
          $sum: { $cond: [{ $eq: ['$eventType', 'add_to_cart'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const dateMap = {};
  orders.forEach(o => {
    dateMap[o._id] = { ...dateMap[o._id], revenue: o.revenue, orders: o.orders };
  });
  events.forEach(e => {
    dateMap[e._id] = { ...dateMap[e._id], ...e };
  });

  const result = Object.entries(dateMap)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue || 0,
      orders: data.orders || 0,
      pageViews: data.pageViews || 0,
      productViews: data.productViews || 0,
      addToCart: data.addToCart || 0,
      conversionRate: data.pageViews > 0 ? ((data.orders / data.pageViews) * 100).toFixed(2) : 0
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return result;
};

exports.getConversionFunnel = async (req, res) => {
  try {
    const { period = '30days' } = req.query;

    let startDate = new Date();
    switch (period) {
      case '7days': startDate.setDate(startDate.getDate() - 7); break;
      case '30days': startDate.setDate(startDate.getDate() - 30); break;
      case '90days': startDate.setDate(startDate.getDate() - 90); break;
      default: startDate.setDate(startDate.getDate() - 30);
    }

    const funnel = await Event.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    const funnelMap = {};
    funnel.forEach(f => {
      funnelMap[f._id] = f.count;
    });

    const uniqueSessions = await Event.distinct('sessionId', {
      createdAt: { $gte: startDate }
    });

    const pageViews = funnelMap['page_view'] || 0;
    const productViews = funnelMap['product_view'] || 0;
    const addToCart = funnelMap['add_to_cart'] || 0;
    const checkouts = funnelMap['checkout_started'] || 0;
    const orders = funnelMap['order_completed'] || 0;

    res.status(200).json({
      success: true,
      funnel: {
        uniqueSessions: uniqueSessions.length,
        pageViews,
        productViews,
        addToCart,
        checkouts,
        orders,
        rates: {
          viewToCart: pageViews > 0 ? ((addToCart / pageViews) * 100).toFixed(2) : 0,
          cartToCheckout: addToCart > 0 ? ((checkouts / addToCart) * 100).toFixed(2) : 0,
          checkoutToOrder: checkouts > 0 ? ((orders / checkouts) * 100).toFixed(2) : 0,
          overall: pageViews > 0 ? ((orders / pageViews) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductAnalytics = async (req, res) => {
  try {
    const { productId } = req.params;
    const { period = '30days' } = req.query;

    let startDate = new Date();
    switch (period) {
      case '7days': startDate.setDate(startDate.getDate() - 7); break;
      case '30days': startDate.setDate(startDate.getDate() - 30); break;
      case '90days': startDate.setDate(startDate.getDate() - 90); break;
      default: startDate.setDate(startDate.getDate() - 30);
    }

    const events = await Event.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    const eventMap = {};
    events.forEach(e => { eventMap[e._id] = e.count; });

    const orders = await Order.find({
      'items.product': productId,
      createdAt: { $gte: startDate },
      orderStatus: { $ne: 'cancelled' }
    });

    let unitsSold = 0;
    let revenue = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.product?.toString() === productId) {
          unitsSold += item.quantity;
          revenue += item.price * item.quantity;
        }
      });
    });

    const product = await Product.findById(productId);
    const conversionRate = eventMap['add_to_cart'] > 0
      ? ((orders.length / eventMap['add_to_cart']) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      productAnalytics: {
        views: eventMap['product_view'] || 0,
        addToCart: eventMap['add_to_cart'] || 0,
        orders: orders.length,
        unitsSold,
        revenue,
        conversionRate,
        inventoryTurnover: product?.stockQuantity > 0
          ? (unitsSold / product.stockQuantity).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getInventoryInsights = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });

    const insights = {
      lowStock: [],
      outOfStock: [],
      slowMoving: [],
      fastMoving: []
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesData = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      }
    ]);

    const salesMap = {};
    salesData.forEach(s => { salesMap[s._id.toString()] = s; });

    products.forEach(product => {
      const productId = product._id.toString();
      const sales = salesMap[productId] || { totalSold: 0, totalRevenue: 0 };

      if (product.stockQuantity === 0) {
        insights.outOfStock.push({
          id: product._id,
          name: product.name,
          category: product.category
        });
      } else if (product.stockQuantity <= product.lowStockThreshold) {
        insights.lowStock.push({
          id: product._id,
          name: product.name,
          stock: product.stockQuantity,
          threshold: product.lowStockThreshold,
          daysOfStock: product.stockQuantity > 0 && sales.totalSold > 0
            ? Math.round(product.stockQuantity / (sales.totalSold / 30))
            : null
        });
      }

      if (sales.totalSold === 0 && product.stockQuantity > 0) {
        insights.slowMoving.push({
          id: product._id,
          name: product.name,
          stock: product.stockQuantity,
          category: product.category
        });
      } else if (sales.totalSold > 20) {
        insights.fastMoving.push({
          id: product._id,
          name: product.name,
          unitsSold: sales.totalSold,
          revenue: sales.totalRevenue,
          category: product.category
        });
      }
    });

    insights.lowStock.sort((a, b) => a.stock - b.stock);
    insights.fastMoving.sort((a, b) => b.unitsSold - a.unitsSold);

    res.status(200).json({
      success: true,
      insights
    });
  } catch (error) {
    next(error);
  }
};
