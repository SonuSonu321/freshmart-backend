const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number },
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  userUsage: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, count: Number }],
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
