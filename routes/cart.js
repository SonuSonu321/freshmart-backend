const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');

// Get cart
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name images price discountPrice unit isAvailable stockQuantity')
      .populate('coupon', 'code discountType discountValue');
    if (!cart) return res.json({ success: true, cart: { items: [], totalAmount: 0 } });
    const totalAmount = cart.items.reduce((t, i) => t + i.price * i.quantity, 0);
    res.json({ success: true, cart: { ...cart.toObject(), totalAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add to cart
router.post('/add', protect, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product || !product.isAvailable) return res.status(400).json({ success: false, message: 'Product not available' });
    if (product.stockQuantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

    const price = product.discountPrice || product.price;
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [{ product: productId, quantity, price }] });
    } else {
      const itemIndex = cart.items.findIndex(i => i.product.toString() === productId);
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].price = price; // keep price fresh
      } else {
        cart.items.push({ product: productId, quantity, price });
      }
      await cart.save();
    }

    cart = await Cart.findById(cart._id).populate('items.product', 'name images price discountPrice unit isAvailable stockQuantity');
    const totalAmount = cart.items.reduce((t, i) => t + i.price * i.quantity, 0);
    res.json({ success: true, cart: { ...cart.toObject(), totalAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update quantity
router.put('/update/:productId', protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(i => i.product.toString() === req.params.productId);
    if (itemIndex === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }
    await cart.save();
    cart = await Cart.findById(cart._id).populate('items.product', 'name images price discountPrice unit isAvailable stockQuantity');
    const totalAmount = cart.items.reduce((t, i) => t + i.price * i.quantity, 0);
    res.json({ success: true, cart: { ...cart.toObject(), totalAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Remove item
router.delete('/remove/:productId', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
    await cart.save();
    cart = await Cart.findById(cart._id).populate('items.product', 'name images price discountPrice unit isAvailable stockQuantity');
    const totalAmount = cart.items.reduce((t, i) => t + i.price * i.quantity, 0);
    res.json({ success: true, cart: { ...cart.toObject(), totalAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Apply coupon
router.post('/coupon', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(400).json({ success: false, message: 'Invalid coupon' });
    if (new Date() > coupon.expiresAt) return res.status(400).json({ success: false, message: 'Coupon expired' });
    if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });

    const cart = await Cart.findOne({ user: req.user._id });
    const totalAmount = cart.items.reduce((t, i) => t + i.price * i.quantity, 0);

    if (totalAmount < coupon.minOrderAmount) {
      return res.status(400).json({ success: false, message: `Minimum order amount is ₹${coupon.minOrderAmount}` });
    }

    let discountAmount = coupon.discountType === 'percentage'
      ? (totalAmount * coupon.discountValue) / 100
      : coupon.discountValue;

    if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);

    cart.coupon = coupon._id;
    cart.discountAmount = discountAmount;
    await cart.save();

    res.json({ success: true, discountAmount, message: `Coupon applied! You save ₹${discountAmount}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Remove coupon
router.delete('/coupon', protect, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { $unset: { coupon: 1 }, discountAmount: 0 });
    res.json({ success: true, message: 'Coupon removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clear cart
router.delete('/clear', protect, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], coupon: null, discountAmount: 0 });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
