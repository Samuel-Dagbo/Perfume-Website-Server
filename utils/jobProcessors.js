const { emailQueue, analyticsQueue, notificationQueue, inventoryQueue } = require('./queue');
const { orderConfirmationEmail, orderStatusUpdateEmail } = require('./emailService');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Event = require('../models/Analytics');

emailQueue.process(async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'order_confirmation':
      await orderConfirmationEmail(data.order, data.user);
      break;
    case 'order_status_update':
      await orderStatusUpdateEmail(data.order, data.user, data.status);
      break;
    default:
      console.warn(`Unknown email type: ${type}`);
  }

  return { success: true, type };
});

analyticsQueue.process(async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'track_event':
      await Event.create(data.eventData);
      break;
    case 'aggregate_daily':
      await aggregateDailyMetrics();
      break;
    default:
      console.warn(`Unknown analytics type: ${type}`);
  }

  return { success: true, type };
});

notificationQueue.process(async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'low_stock_alert':
      console.log(`Low stock alert for product ${data.productId}`);
      break;
    case 'order_update':
      console.log(`Order ${data.orderId} status updated to ${data.status}`);
      break;
    default:
      console.warn(`Unknown notification type: ${type}`);
  }

  return { success: true, type };
});

inventoryQueue.process(async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'recalculate_sales':
      await recalculateProductSales(data.productId);
      break;
    case 'restock_alert':
      console.log(`Restock alert for product ${data.productId}`);
      break;
    default:
      console.warn(`Unknown inventory type: ${type}`);
  }

  return { success: true, type };
});

const aggregateDailyMetrics = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await Event.aggregate([
    { $match: { createdAt: { $gte: today } } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 }
      }
    }
  ]);

  const orders = await Order.aggregate([
    { $match: { createdAt: { $gte: today } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        orderCount: { $sum: 1 }
      }
    }
  ]);

  console.log('Daily metrics aggregated:', {
    events: events.reduce((acc, e) => ({ ...acc, [e._id]: e.count }), {}),
    orders: orders[0] || { totalRevenue: 0, orderCount: 0 }
  });
};

const recalculateProductSales = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) return;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sales = await Order.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, orderStatus: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    { $match: { 'items.product': product._id } },
    {
      $group: {
        _id: null,
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    }
  ]);

  if (sales.length > 0) {
    console.log(`Product ${product.name}:`, sales[0]);
  }
};

const jobHelpers = {
  async sendOrderConfirmation(order, user) {
    return await emailQueue.add('order_confirmation', {
      type: 'order_confirmation',
      data: { order, user }
    }, {
      priority: 1,
      delay: 0
    });
  },

  async sendOrderStatusUpdate(order, user, status) {
    return await emailQueue.add('order_status_update', {
      type: 'order_status_update',
      data: { order, user, status }
    }, {
      priority: 2,
      delay: 0
    });
  },

  async trackEventAsync(eventData) {
    return await analyticsQueue.add('track_event', {
      type: 'track_event',
      data: { eventData }
    }, {
      priority: 5
    });
  },

  async sendLowStockAlert(productId) {
    return await notificationQueue.add('low_stock_alert', {
      type: 'low_stock_alert',
      data: { productId }
    }, {
      priority: 1
    });
  },

  async recalculateProductMetrics(productId) {
    return await inventoryQueue.add('recalculate_sales', {
      type: 'recalculate_sales',
      data: { productId }
    }, {
      priority: 3
    });
  }
};

module.exports = jobHelpers;
