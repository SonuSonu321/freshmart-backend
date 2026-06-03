const express = require('express');
const router = express.Router();
const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const generateToken = require('../utils/generateToken');
const { protect, deliveryOnly } = require('../middleware/auth');

// Delivery partner login
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const partner = await DeliveryPartner.findOne({ mobile });
    if (!partner || !(await partner.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    res.json({
      success: true,
      token: generateToken(partner._id, 'delivery'),
      partner: { _id: partner._id, name: partner.name, mobile: partner.mobile, vehicleType: partner.vehicleType }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get assigned orders
router.get('/orders', protect, deliveryOnly, async (req, res) => {
  try {
    const orders = await Order.find({
      deliveryPartner: req.user._id,
      orderStatus: { $in: ['confirmed', 'packed', 'out_for_delivery'] }
    }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update order delivery status
router.put('/orders/:id/status', protect, deliveryOnly, async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = status;
    order.statusHistory.push({ status, note });
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      await DeliveryPartner.findByIdAndUpdate(req.user._id, { $inc: { totalDeliveries: 1 } });
    }
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update location
router.put('/location', protect, deliveryOnly, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await DeliveryPartner.findByIdAndUpdate(req.user._id, {
      currentLocation: { lat, lng, updatedAt: new Date() }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
