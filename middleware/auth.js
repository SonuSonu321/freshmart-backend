const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'delivery') {
      req.user = await DeliveryPartner.findById(decoded.id).select('-password');
    } else {
      req.user = await User.findById(decoded.id).select('-password');
    }
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user.role = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Admin access required' });
};

exports.deliveryOnly = (req, res, next) => {
  if (req.user && req.user.role === 'delivery') return next();
  res.status(403).json({ success: false, message: 'Delivery partner access required' });
};
