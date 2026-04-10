const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    default: null
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['perfume', 'oil', 'gift set', 'accessories']
  },
  images: [{
    url: { type: String, required: true },
    alt: { type: String, default: '' }
  }],
  stockQuantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: 0
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  brand: {
    type: String,
    default: 'Luxury Perfume'
  },
  size: {
    type: String,
    default: '100ml'
  },
  notes: {
    top: { type: String, default: '' },
    middle: { type: String, default: '' },
    base: { type: String, default: '' }
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.virtual('isLowStock').get(function() {
  return this.stockQuantity > 0 && this.stockQuantity <= this.lowStockThreshold;
});

productSchema.virtual('isOutOfStock').get(function() {
  return this.stockQuantity === 0;
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
