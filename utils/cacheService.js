const CacheEntry = require('../models/dbCache');

const DEFAULT_TTL = 5 * 60;
const SHORT_TTL = 60;
const MEDIUM_TTL = 5 * 60;
const LONG_TTL = 60 * 60;

const CACHE_KEYS = {
  PRODUCTS_LIST: 'products:list',
  FEATURED_PRODUCTS: 'products:featured',
  PRODUCT_DETAIL: (id) => `product:${id}`,
  ORDERS_STATS: 'orders:stats',
  DASHBOARD_STATS: 'admin:dashboard',
  ANALYTICS_OVERVIEW: (period) => `analytics:overview:${period}`,
  USER_ORDERS: (userId) => `user:${userId}:orders`,
  CART: (userId) => `cart:${userId}`,
  COUPON: (code) => `coupon:${code}`,
};

class CacheService {
  static async get(key) {
    try {
      const entry = await CacheEntry.findOne({
        key,
        expiresAt: { $gt: new Date() }
      }).lean();

      if (entry) {
        return entry.value;
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key, value, ttlSeconds = DEFAULT_TTL) {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await CacheEntry.findOneAndUpdate(
        { key },
        { key, value, expiresAt },
        { upsert: true, new: true }
      );
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  static async del(key) {
    try {
      await CacheEntry.deleteOne({ key });
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  static async delPattern(pattern) {
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const result = await CacheEntry.deleteMany({ key: regex });
      return result.deletedCount;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  static async invalidateProducts() {
    await this.delPattern('^products');
    await this.del(CACHE_KEYS.FEATURED_PRODUCTS);
  }

  static async invalidateUserCart(userId) {
    await this.del(CACHE_KEYS.CART(userId));
  }

  static async invalidateUserOrders(userId) {
    await this.delPattern(`^user:${userId}`);
  }

  static async invalidateOrders() {
    await this.delPattern('^orders');
    await this.delPattern('^admin');
  }

  static async invalidateAnalytics() {
    await this.delPattern('^analytics');
  }

  static async invalidateCoupons() {
    await this.del(CACHE_KEYS.COUPON('*'));
  }
}

module.exports = {
  CacheService,
  CACHE_KEYS,
  TTL: {
    SHORT: SHORT_TTL,
    DEFAULT: DEFAULT_TTL,
    MEDIUM: MEDIUM_TTL,
    LONG: LONG_TTL
  }
};
