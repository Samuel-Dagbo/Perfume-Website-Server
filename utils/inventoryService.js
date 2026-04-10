const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');

const updateInventory = async ({
  productId,
  quantityChange,
  changeType,
  reason = '',
  reference = null,
  referenceModel = null,
  userId = null
}) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(productId).session(session);
    
    if (!product) {
      throw new Error('Product not found');
    }

    const previousQuantity = product.stockQuantity;
    const newQuantity = previousQuantity + quantityChange;

    if (newQuantity < 0) {
      throw new Error('Insufficient stock available');
    }

    product.stockQuantity = newQuantity;
    await product.save({ session });

    await InventoryLog.create([{
      product: productId,
      changeType,
      quantityChanged: quantityChange,
      previousQuantity,
      newQuantity,
      reason,
      reference,
      referenceModel,
      user: userId
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return { success: true, product, previousQuantity, newQuantity };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const bulkUpdateInventory = async (updates, userId = null) => {
  const results = [];
  
  for (const update of updates) {
    try {
      const result = await updateInventory({
        ...update,
        userId
      });
      results.push({ ...result, productId: update.productId });
    } catch (error) {
      results.push({ 
        success: false, 
        productId: update.productId, 
        error: error.message 
      });
    }
  }

  return results;
};

const checkStockAvailability = async (items) => {
  const availability = [];
  
  for (const item of items) {
    const product = await Product.findById(item.product);
    
    if (!product) {
      availability.push({
        productId: item.product,
        available: false,
        error: 'Product not found'
      });
    } else if (product.stockQuantity < item.quantity) {
      availability.push({
        productId: item.product,
        available: false,
        requested: item.quantity,
        inStock: product.stockQuantity,
        error: 'Insufficient stock'
      });
    } else {
      availability.push({
        productId: item.product,
        available: true,
        inStock: product.stockQuantity
      });
    }
  }

  return availability;
};

const getInventoryStats = async () => {
  const allProducts = await Product.find().select('stockQuantity lowStockThreshold');
  
  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  let totalStock = 0;

  for (const product of allProducts) {
    totalStock += product.stockQuantity;
    if (product.stockQuantity === 0) {
      outOfStockProducts++;
    } else if (product.stockQuantity <= product.lowStockThreshold) {
      lowStockProducts++;
    }
  }

  const stats = {
    totalProducts: await Product.countDocuments(),
    totalStock: [{ total: totalStock }],
    lowStockProducts,
    outOfStockProducts,
    inventoryLogs: await InventoryLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('product', 'name')
      .populate('user', 'name')
  };

  return stats;
};

module.exports = {
  updateInventory,
  bulkUpdateInventory,
  checkStockAvailability,
  getInventoryStats
};
