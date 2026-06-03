const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryPartnerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String, required: true },
  avatar: { type: String },
  vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'car'], default: 'bike' },
  vehicleNumber: { type: String },
  isAvailable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date }
  },
  totalDeliveries: { type: Number, default: 0 },
  rating: { type: Number, default: 0 }
}, { timestamps: true });

deliveryPartnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

deliveryPartnerSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
