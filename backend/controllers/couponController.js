import Coupon from '../models/Coupon.js';
import Event from '../models/Event.js';
import logger from '../utils/logger.js';

const ALLOWED_CREATE_FIELDS = [
  'code', 'discountType', 'discountValue', 'minAmount', 'maxDiscount',
  'maxUses', 'event', 'expiresAt', 'isActive',
];

const ALLOWED_UPDATE_FIELDS = [
  'code', 'discountType', 'discountValue', 'minAmount', 'maxDiscount',
  'maxUses', 'event', 'expiresAt', 'isActive',
];

function sanitizeCoupon(body, allowedFields) {
  const sanitized = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      sanitized[field] = body[field];
    }
  }
  return sanitized;
}

export const createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(sanitizeCoupon(req.body, ALLOWED_CREATE_FIELDS));
    res.status(201).json({ coupon });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Coupon code already exists' });
    }
    logger.error('Failed to create coupon:', err);
    res.status(500).json({ message: 'Failed to create coupon' });
  }
};

export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort('-createdAt').populate('event', 'title');
    res.json({ coupons });
  } catch (err) {
    logger.error('Failed to fetch coupons:', err);
    res.status(500).json({ message: 'Failed to fetch coupons' });
  }
};

export const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).populate('event', 'title');
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ coupon });
  } catch (err) {
    logger.error('Failed to fetch coupon:', err);
    res.status(500).json({ message: 'Failed to fetch coupon' });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      sanitizeCoupon(req.body, ALLOWED_UPDATE_FIELDS),
      { new: true, runValidators: true }
    );
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ coupon });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Coupon code already exists' });
    }
    logger.error('Failed to update coupon:', err);
    res.status(500).json({ message: 'Failed to update coupon' });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete coupon' });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, eventId } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) {
      return res.json({ valid: false, message: 'Invalid coupon code' });
    }

    if (!coupon.isActive) {
      return res.json({ valid: false, message: 'This coupon is no longer active' });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.json({ valid: false, message: 'This coupon has expired' });
    }

    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
      return res.json({ valid: false, message: 'This coupon has reached its usage limit' });
    }

    if (coupon.event && coupon.event.toString() !== eventId) {
      return res.json({ valid: false, message: 'This coupon is not valid for this event' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.json({ valid: false, message: 'Event not found' });
    }

    const originalPrice = event.price || 0;

    if (coupon.minAmount > 0 && originalPrice < coupon.minAmount) {
      return res.json({ valid: false, message: `Minimum order amount of ₹${coupon.minAmount} required` });
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (originalPrice * coupon.discountValue) / 100;
      if (coupon.maxDiscount > 0) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, originalPrice);
    }

    const finalPrice = originalPrice - discountAmount;

    res.json({
      valid: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
      },
      originalPrice,
      discountAmount: Math.round(discountAmount),
      finalPrice: Math.round(finalPrice),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to validate coupon' });
  }
};
