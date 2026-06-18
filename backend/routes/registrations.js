import express from 'express';
import {
  registerForEvent, cancelRegistration, getMyRegistrations,
  checkRegistration, submitFeedback, checkInAttendee,
  regenerateQRCode,
} from '../controllers/registrationController.js';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';

const router = express.Router();

router.use(protect);

router.get('/my', getMyRegistrations);
router.get('/check/:eventId', checkRegistration);
router.post('/:eventId', registerForEvent);
router.delete('/:eventId', cancelRegistration);
router.post('/:id/feedback', submitFeedback);

// Admin only
router.post('/:id/checkin', adminOnly, checkInAttendee);
router.post('/:id/regenerate-qr', adminOnly, regenerateQRCode);

export default router;