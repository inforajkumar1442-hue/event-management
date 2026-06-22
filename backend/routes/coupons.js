import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';
import {
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from '../controllers/couponController.js';

const router = Router();

router.post('/validate', protect, validateCoupon);

router.use(protect, adminOnly);
router.route('/')
  .get(getCoupons)
  .post(createCoupon);
router.route('/:id')
  .get(getCoupon)
  .patch(updateCoupon)
  .delete(deleteCoupon);

export default router;
