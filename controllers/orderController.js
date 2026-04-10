const Order = require('../models/Order');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const User = require('../models/User');
const { updateInventory, checkStockAvailability } = require('../utils/inventoryService');
const { CacheService, CACHE_KEYS } = require('../utils/cacheService');
const { PerformanceMonitor, CircuitBreaker } = require('../utils/logger');
const jobHelpers = require('../utils/jobProcessors');

const emailCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000
});

exports.createOrder = async (req, res, next) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;

    const availability = await checkStockAvailability(items);
    const insufficientStock = availability.filter(item => !item.available);

    if (insufficientStock.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Some items have insufficient stock',
        insufficientItems: insufficientStock
      });
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity
      });

      subtotal += product.price * item.quantity;
    }

    const TAX_RATE = 0.03;
    const shippingCost = 0;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + shippingCost + tax;

    const order = await Order.create([{
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingCost,
      tax,
      total,
      paymentMethod: paymentMethod || 'cod',
      notes
    }], { session });

    for (const item of items) {
      await updateInventory({
        productId: item.product,
        quantityChange: -item.quantity,
        changeType: 'sale',
        reason: `Order ${order[0]._id}`,
        reference: order[0]._id,
        referenceModel: 'Order',
        userId: req.user.id
      });
    }

    await Sale.create([{
      user: req.user.id,
      items: orderItems,
      subtotal,
      tax,
      total,
      saleType: 'online',
      order: order[0]._id,
      cashier: req.user.id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    await CacheService.invalidateOrders();

    jobHelpers.sendOrderConfirmation(order[0], { _id: req.user.id, name: req.user.name, email: req.user.email }).catch(err => {
      console.error('Failed to queue order confirmation email:', err);
    });

    res.status(201).json({
      success: true,
      order: order[0]
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort('-createdAt')
      .populate('items.product', 'name images')
      .lean();

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('user', 'name email')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;

    const order = await Order.findById(req.params.id).populate('user');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.orderStatus = orderStatus;
    await order.save();

    await CacheService.invalidateOrders();

    if (order.user && ['processing', 'shipped', 'delivered', 'cancelled'].includes(orderStatus)) {
      jobHelpers.sendOrderStatusUpdate(order, order.user, orderStatus).catch(err => {
        console.error('Failed to queue status update email:', err);
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = '-createdAt'
    } = req.query;

    const cacheKey = `orders:list:${page}:${limit}:${status}:${search}:${sort}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const query = {};

    if (status) {
      query.orderStatus = status;
    }

    if (search) {
      query.$or = [
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
        { _id: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Math.min(Number(limit), 100);

    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'name email')
      .lean();

    const total = await Order.countDocuments(query);

    const result = {
      success: true,
      orders,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalOrders: total
      }
    };

    await CacheService.set(cacheKey, result, 60);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order in current status'
      });
    }

    for (const item of order.items) {
      await updateInventory({
        productId: item.product,
        quantityChange: item.quantity,
        changeType: 'return',
        reason: `Order cancellation ${order._id}`,
        reference: order._id,
        referenceModel: 'Order',
        userId: req.user.id
      });
    }

    order.orderStatus = 'cancelled';
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    await CacheService.invalidateOrders();

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
