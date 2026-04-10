const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: ['page_view', 'product_view', 'add_to_cart', 'checkout_started', 'order_completed', 'search', 'filter']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    default: null
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  source: {
    type: String,
    default: 'web'
  },
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  browser: {
    type: String,
    default: null
  },
  os: {
    type: String,
    default: null
  },
  country: {
    type: String,
    default: null
  },
  city: {
    type: String,
    default: null
  },
  page: {
    type: String,
    default: null
  },
  referrer: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

eventSchema.index({ eventType: 1, createdAt: -1 });
eventSchema.index({ userId: 1, createdAt: -1 });
eventSchema.index({ productId: 1, createdAt: -1 });
eventSchema.index({ sessionId: 1 });
eventSchema.index({ createdAt: -1 });

const dailyAggregateSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true
  },
  metrics: {
    pageViews: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
    addToCart: { type: Number, default: 0 },
    checkouts: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },
  topProducts: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    views: { type: Number, default: 0 },
    carts: { type: Number, default: 0 },
    orders: { type: Number, default: 0 }
  }],
  trafficSources: {
    direct: { type: Number, default: 0 },
    organic: { type: Number, default: 0 },
    referral: { type: Number, default: 0 },
    social: { type: Number, default: 0 }
  },
  devices: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

dailyAggregateSchema.index({ date: 1 });

const Event = mongoose.model('Event', eventSchema);
const DailyAggregate = mongoose.model('DailyAggregate', dailyAggregateSchema);

module.exports = { Event, DailyAggregate };
