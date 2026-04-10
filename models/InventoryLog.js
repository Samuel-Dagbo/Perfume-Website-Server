const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  changeType: {
    type: String,
    enum: ['sale', 'restock', 'manual_adjustment', 'return', 'damaged'],
    required: true
  },
  quantityChanged: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    maxlength: 500
  },
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Order', 'Sale', 'User']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

inventoryLogSchema.index({ product: 1 });
inventoryLogSchema.index({ changeType: 1 });
inventoryLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
