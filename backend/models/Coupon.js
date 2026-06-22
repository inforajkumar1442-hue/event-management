import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  minAmount: {
    type: Number,
    default: 0,
  },
  maxDiscount: {
    type: Number,
    default: 0,
  },
  maxUses: {
    type: Number,
    default: 0,
  },
  currentUses: {
    type: Number,
    default: 0,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  expiresAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);
