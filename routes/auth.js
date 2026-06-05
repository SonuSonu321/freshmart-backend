const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/auth');
const sendSMS = require('../utils/sendSMS');

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, message: 'Mobile number required' });

    const exists = await User.findOne({ mobile });
    if (exists) return res.status(400).json({ success: false, message: 'Mobile already registered' });

    // Delete old OTPs for this mobile
    await OTP.deleteMany({ mobile });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({ mobile, otp, expiresAt });

    // Send SMS
    await sendSMS(mobile, `Your FreshMart OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`);

    // In development, also log OTP
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP] Mobile: ${mobile}, OTP: ${otp}`);
    }

    res.json({ success: true, message: `OTP sent to ${mobile.slice(0, 3)}XXXXXXX${mobile.slice(-2)}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    const record = await OTP.findOne({ mobile, verified: false });

    if (!record) return res.status(400).json({ success: false, message: 'OTP not found. Please request a new one.' });
    if (new Date() > record.expiresAt) return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    if (record.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });

    record.verified = true;
    await record.save();

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register (requires OTP verified first)
router.post('/register', [
  body('name').notEmpty().trim(),
  body('mobile').notEmpty().trim().isLength({ min: 10, max: 15 }),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });

  try {
    const { name, mobile, email, password, referralCode } = req.body;

    // Check OTP was verified
    const otpRecord = await OTP.findOne({ mobile, verified: true });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Mobile number not verified. Please verify OTP first.' });
    }

    const exists = await User.findOne({ mobile });
    if (exists) return res.status(400).json({ success: false, message: 'Mobile already registered' });

    let referredBy;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) referredBy = referrer._id;
    }

    const user = await User.create({ name, mobile, email, password, referredBy });

    // Clean up OTP records
    await OTP.deleteMany({ mobile });

    res.status(201).json({
      success: true,
      token: generateToken(user._id, user.role),
      user: { _id: user._id, name: user.name, mobile: user.mobile, email: user.email, role: user.role, referralCode: user.referralCode }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const user = await User.findOne({ mobile });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });

    res.json({
      success: true,
      token: generateToken(user._id, user.role),
      user: { _id: user._id, name: user.name, mobile: user.mobile, email: user.email, role: user.role, referralCode: user.referralCode, walletBalance: user.walletBalance }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'admin' });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
    res.json({
      success: true,
      token: generateToken(user._id, 'admin'),
      user: { _id: user._id, name: user.name, email: user.email, role: 'admin' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update profile
router.put('/me', protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, email }, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Seed admin (one-time) - supports both GET and POST
router.get('/seed-admin', async (req, res) => {
  try {
    const exists = await User.findOne({ role: 'admin' });
    if (exists) return res.json({ success: false, message: 'Admin already exists', email: exists.email });
    const admin = await User.create({
      name: 'Admin',
      mobile: '9999999999',
      email: process.env.ADMIN_EMAIL || 'admin@freshmart.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });
    res.json({ success: true, message: 'Admin created! Login with: ' + admin.email + ' / ' + (process.env.ADMIN_PASSWORD || 'admin123') });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/seed-admin', async (req, res) => {
  try {
    const exists = await User.findOne({ role: 'admin' });
    if (exists) return res.json({ success: false, message: 'Admin already exists' });
    const admin = await User.create({
      name: 'Admin',
      mobile: '9999999999',
      email: process.env.ADMIN_EMAIL || 'admin@freshmart.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });
    res.json({ success: true, message: 'Admin created', email: admin.email });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
