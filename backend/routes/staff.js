import express from 'express';
import {
  getTodayEvents,
  getEventAttendees,
  checkInAttendee,
  checkInByTicketNumber,
  getStaffStats
} from '../controllers/staffController.js';
import { protect } from '../middleware/auth.js';
import { staffOnly } from '../middleware/staff.js';

const router = express.Router();

// All staff routes require authentication and staff/admin role
router.use(protect, staffOnly);

// Dashboard stats
router.get('/stats', getStaffStats);

// Today's events
router.get('/today-events', getTodayEvents);

// Event attendees (for today's events only)
router.get('/events/:eventId/attendees', getEventAttendees);

// Check in attendee by registration ID
router.post('/events/:eventId/checkin/:registrationId', checkInAttendee);

// Check in attendee by ticket number
router.post('/events/:eventId/checkin-by-ticket', checkInByTicketNumber);

export default router;