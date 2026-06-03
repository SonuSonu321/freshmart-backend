const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products', 'name images price discountPrice unit isAvailable averageRating');
    res.json({ success: true, wishlist: wishlist || { products: [] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/toggle/:productId', protect, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) wishlist = await Wishlist.create({ user: req.user._id, products: [] });

    const idx = wishlist.products.indexOf(req.params.productId);
    let added;
    if (idx > -1) {
      wishlist.products.splice(idx, 1);
      added = false;
    } else {
      wishlist.products.push(req.params.productId);
      added = true;
    }
    await wishlist.save();
    res.json({ success: true, added, message: added ? 'Added to wishlist' : 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
