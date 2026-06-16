// backend/routes/payments.js
// Add this route
import express from 'express';
import {
  createCheckoutSession,
  verifyPayment,
  handleStripeWebhook,  // Add this import
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Webhook needs raw body, not parsed JSON
router.post('/webhook', express.raw({type: 'application/json'}), handleStripeWebhook);

// Protected routes (require authentication)
router.post('/create-checkout-session/:eventId', protect, createCheckoutSession);
router.get('/verify/:sessionId', protect, verifyPayment);

export default router;