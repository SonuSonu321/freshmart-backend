const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0 },
  description: { type: String },
  images: [{ type: String }],
  stockQuantity: { type: Number, required: true, default: 0 },
  unit: { type: String, enum: ['kg', 'gram', 'piece', 'dozen', 'liter'], default: 'piece' },
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  tags: [{ type: String }],
  pincodes: [{ type: String }]
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
