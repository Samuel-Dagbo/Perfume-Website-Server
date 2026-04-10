const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: String,
  image: String,
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  total: {
    type: Number,
    required: true
  }
});

const saleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  saleType: {
    type: String,
    enum: ['online', 'in-person'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'other'],
    default: 'cash'
  },
  customerInfo: {
    name: { type: String },
    phone: { type: String },
    email: { type: String }
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

saleSchema.index({ saleType: 1 });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ 'items.product': 1 });

module.exports = mongoose.model('Sale', saleSchema);
