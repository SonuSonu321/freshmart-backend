const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const DeliveryPartner = require('../models/DeliveryPartner');
const { protect, adminOnly } = require('../middleware/auth');
const sendSMS = require('../utils/sendSMS');

// Dashboard analytics
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const [totalOrders, totalCustomers, totalProducts, revenueData] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const totalRevenue = revenueData[0]?.total || 0;

    // Monthly sales (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlySales = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, paymentStatus: 'paid' } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    res.json({ success: true, analytics: { totalOrders, totalCustomers, totalProducts, totalRevenue, monthlySales, topProducts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all orders
router.get('/orders', protect, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { orderStatus: status } : {};
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query).populate('user', 'name mobile email').populate('deliveryPartner', 'name mobile').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments(query)
    ]);
    res.json({ success: true, orders, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update order status
router.put('/orders/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, note, deliveryPartnerId } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'mobile email name');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = status;
    order.statusHistory.push({ status, note: note || `Status updated to ${status}` });
    if (deliveryPartnerId) order.deliveryPartner = deliveryPartnerId;
    if (status === 'delivered') order.deliveredAt = new Date();

    await order.save();

    // SMS notification
    if (order.user?.mobile) {
      const messages = {
        confirmed: `Your FreshMart order #${order.orderId} is confirmed! We're preparing it.`,
        packed: `Your order #${order.orderId} is packed and ready for pickup.`,
        out_for_delivery: `Your order #${order.orderId} is out for delivery! Expected soon.`,
        delivered: `Your order #${order.orderId} has been delivered. Enjoy your fresh produce!`,
        cancelled: `Your order #${order.orderId} has been cancelled.`
      };
      if (messages[status]) await sendSMS(order.user.mobile, messages[status]);
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all customers
router.get('/customers', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments({ role: 'customer' })
    ]);
    res.json({ success: true, customers, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delivery partner management
router.get('/delivery-partners', protect, adminOnly, async (req, res) => {
  try {
    const partners = await DeliveryPartner.find().select('-password');
    res.json({ success: true, partners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/delivery-partners', protect, adminOnly, async (req, res) => {
  try {
    const partner = await DeliveryPartner.create(req.body);
    res.status(201).json({ success: true, partner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/delivery-partners/:id', protect, adminOnly, async (req, res) => {
  try {
    const partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json({ success: true, partner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
