const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort, page = 1, limit = 20, pincode } = req.query;
    const query = { isAvailable: true };

    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    if (minPrice || maxPrice) query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
    if (pincode) query.$or = [{ pincodes: { $size: 0 } }, { pincodes: pincode }];

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'rating') sortObj = { averageRating: -1 };

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).populate('category', 'name slug').sort(sortObj).skip(skip).limit(Number(limit)),
      Product.countDocuments(query)
    ]);

    res.json({ success: true, products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create product (admin)
router.post('/', protect, adminOnly, upload.array('images', 5), async (req, res) => {
  try {
    const { name, category, price, discountPrice, description, stockQuantity, unit, isFeatured, pincodes } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const images = req.files ? req.files.map(f => f.path) : [];
    const product = await Product.create({
      name, slug, category, price, discountPrice, description,
      stockQuantity, unit, isFeatured, images,
      pincodes: pincodes ? JSON.parse(pincodes) : []
    });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update product (admin)
router.put('/:id', protect, adminOnly, upload.array('images', 5), async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.files && req.files.length > 0) update.images = req.files.map(f => f.path);
    if (req.body.pincodes) update.pincodes = JSON.parse(req.body.pincodes);
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete product (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get featured products
router.get('/featured/list', async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true, isAvailable: true })
      .populate('category', 'name').limit(10);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
