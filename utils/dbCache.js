const mongoose = require('mongoose');

const cacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

cacheSchema.index({ key: 1, expiresAt: 1 });

cacheSchema.statics.cleanup = async function() {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    if (result.deletedCount > 0) {
      console.log(`Cache cleanup: removed ${result.deletedCount} expired entries`);
    }
    return result;
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
};

const CacheEntry = mongoose.model('CacheEntry', cacheSchema);

setInterval(() => {
  CacheEntry.cleanup();
}, 60 * 60 * 1000);

module.exports = CacheEntry;
