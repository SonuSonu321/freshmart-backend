const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');
const sendSMS = require('../utils/sendSMS');
const sendEmail = require('../utils/sendEmail');
const { getDistanceKm } = require('../utils/distance');

const SHOP_LAT = parseFloat(process.env.SHOP_LAT || '28.6139');
const SHOP_LNG = parseFloat(process.env.SHOP_LNG || '77.2090');
const DELIVERY_RADIUS_KM = parseFloat(process.env.DELIVERY_RADIUS_KM || '4');

// Check delivery availability
router.post('/check-delivery', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.json({ available: true, message: 'Location not provided, assuming deliverable' });
    }
    const distance = getDistanceKm(SHOP_LAT, SHOP_LNG, lat, lng);
    const available = distance <= DELIVERY_RADIUS_KM;
    res.json({
      available,
      distance: distance.toFixed(2),
      maxRadius: DELIVERY_RADIUS_KM,
      message: available
        ? `Great! We deliver to your area (${distance.toFixed(1)} km from our shop)`
        : `Sorry, we currently deliver only within ${DELIVERY_RADIUS_KM} km of our shop. Your location is ${distance.toFixed(1)} km away.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Place order
router.post('/', protect, async (req, res) => {
  try {
    const { deliveryAddress, paymentMethod, razorpayOrderId, razorpayPaymentId } = req.body;

    // Delivery radius check
    const coords = deliveryAddress?.coordinates;
    if (coords?.lat && coords?.lng) {
      const distance = getDistanceKm(SHOP_LAT, SHOP_LNG, coords.lat, coords.lng);
      if (distance > DELIVERY_RADIUS_KM) {
        return res.status(400).json({
          success: false,
          message: `Sorry! We only deliver within ${DELIVERY_RADIUS_KM} km of our shop. Your location is ${distance.toFixed(1)} km away. We're working on expanding our delivery area soon! 🚀`
        });
      }
    }
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });

    // Validate stock and build items
    const items = [];
    let subtotal = 0;
    for (const item of cart.items) {
      if (!item.product.isAvailable || item.product.stockQuantity < item.quantity) {
        return res.status(400).json({ success: false, message: `${item.product.name} is out of stock` });
      }
      items.push({
        product: item.product._id,
        name: item.product.name,
        image: item.product.images[0] || '',
        price: item.price,
        quantity: item.quantity,
        unit: item.product.unit
      });
      subtotal += item.price * item.quantity;
    }

    const deliveryFee = subtotal >= 500 ? 0 : 25;
    const discount = cart.discountAmount || 0;
    const totalAmount = subtotal + deliveryFee - discount;

    const order = await Order.create({
      user: req.user._id,
      items,
      deliveryAddress,
      subtotal,
      deliveryFee,
      discount,
      totalAmount,
      coupon: cart.coupon,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      razorpayOrderId,
      razorpayPaymentId,
      statusHistory: [{ status: 'pending', note: 'Order placed' }]
    });

    // Deduct stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, { $inc: { stockQuantity: -item.quantity } });
    }

    // Update coupon usage
    if (cart.coupon) {
      await Coupon.findByIdAndUpdate(cart.coupon, { $inc: { usedCount: 1 } });
    }

    // Clear cart
    await Cart.findByIdAndUpdate(cart._id, { items: [], coupon: null, discountAmount: 0 });

    // Notifications
    const user = req.user;
    if (user.mobile) {
      await sendSMS(user.mobile, `Your FreshMart order #${order.orderId} has been placed! Total: ₹${totalAmount}. We'll deliver soon.`);
    }
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: `Order Confirmed - ${order.orderId}`,
        html: `<h2>Order Confirmed!</h2><p>Your order #${order.orderId} has been placed successfully.</p><p>Total: ₹${totalAmount}</p>`
      });
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get user orders
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments({ user: req.user._id })
    ]);
    res.json({ success: true, orders, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('deliveryPartner', 'name mobile currentLocation vehicleType');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancel order
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
    }

    order.orderStatus = 'cancelled';
    order.cancelReason = req.body.reason || 'Cancelled by customer';
    order.statusHistory.push({ status: 'cancelled', note: order.cancelReason });

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity } });
    }

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
