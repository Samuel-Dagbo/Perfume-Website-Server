const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscount: {
    type: Number,
    default: null
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usedCount: {
    type: Number,
    default: 0
  },
  perUserLimit: {
    type: Number,
    default: 1
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Expiration date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableCategories: [{
    type: String,
    enum: ['perfume', 'oil', 'gift set', 'accessories', 'all']
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, validUntil: 1 });

couponSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         now <= this.validUntil &&
         (this.usageLimit === null || this.usedCount < this.usageLimit);
};

couponSchema.methods.calculateDiscount = function(subtotal, category = 'all') {
  if (!this.isValid()) return 0;
  
  if (this.applicableCategories.length > 0 && !this.applicableCategories.includes('all')) {
    if (!this.applicableCategories.includes(category)) return 0;
  }
  
  if (subtotal < this.minOrderAmount) return 0;
  
  let discount = 0;
  if (this.discountType === 'percentage') {
    discount = (subtotal * this.discountValue) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else {
    discount = this.discountValue;
  }
  
  return Math.min(discount, subtotal);
};

module.exports = mongoose.model('Coupon', couponSchema);
