const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { updateInventory, checkStockAvailability } = require('../utils/inventoryService');

exports.createInPersonSale = async (req, res, next) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const { items, customerInfo, paymentMethod, notes } = req.body;

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
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      
      saleItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity
      });

      subtotal += product.price * item.quantity;
    }

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const sale = await Sale.create([{
      items: saleItems,
      subtotal,
      tax,
      total,
      saleType: 'in-person',
      paymentMethod: paymentMethod || 'cash',
      customerInfo,
      notes,
      cashier: req.user.id
    }], { session });

    for (const item of items) {
      await updateInventory({
        productId: item.product,
        quantityChange: -item.quantity,
        changeType: 'sale',
        reason: `In-person sale ${sale[0]._id}`,
        reference: sale[0]._id,
        referenceModel: 'Sale',
        userId: req.user.id
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      sale: sale[0]
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

exports.getSales = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      saleType,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (saleType) {
      query.saleType = saleType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const sales = await Sale.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .populate('items.product', 'name sku')
      .populate('cashier', 'name');

    const total = await Sale.countDocuments(query);

    res.status(200).json({
      success: true,
      sales,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalSales: total
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSalesStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const stats = await Sale.aggregate([
      {
        $facet: {
          totalSales: [
            {
              $group: {
                _id: null,
                total: { $sum: '$total' },
                count: { $sum: 1 }
              }
            }
          ],
          onlineSales: [
            { $match: { saleType: 'online' } },
            {
              $group: {
                _id: null,
                total: { $sum: '$total' },
                count: { $sum: 1 }
              }
            }
          ],
          inPersonSales: [
            { $match: { saleType: 'in-person' } },
            {
              $group: {
                _id: null,
                total: { $sum: '$total' },
                count: { $sum: 1 }
              }
            }
          ],
          todaySales: [
            { $match: { createdAt: { $gte: today } } },
            {
              $group: {
                _id: null,
                total: { $sum: '$total' },
                count: { $sum: 1 }
              }
            }
          ],
          weeklySales: [
            { $match: { createdAt: { $gte: weekAgo } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                total: { $sum: '$total' },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          topProducts: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                totalSold: { $sum: '$items.quantity' },
                totalRevenue: { $sum: '$items.total' }
              }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total: stats[0].totalSales[0] || { total: 0, count: 0 },
        online: stats[0].onlineSales[0] || { total: 0, count: 0 },
        inPerson: stats[0].inPersonSales[0] || { total: 0, count: 0 },
        today: stats[0].todaySales[0] || { total: 0, count: 0 },
        weeklySales: stats[0].weeklySales,
        topProducts: stats[0].topProducts
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecentSales = async (req, res, next) => {
  try {
    const sales = await Sale.find()
      .sort('-createdAt')
      .limit(10)
      .populate('items.product', 'name')
      .populate('cashier', 'name');

    res.status(200).json({
      success: true,
      sales
    });
  } catch (error) {
    next(error);
  }
};
