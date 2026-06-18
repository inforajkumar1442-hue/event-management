import express from 'express';
import { body } from 'express-validator';
import {
  getEvents, getEventById, createEvent, updateEvent,
  deleteEvent, getCategories, updateEventStatus,
} from '../controllers/eventController.js';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

const eventValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10–2000 characters'),
  body('category').isIn(['Workshop', 'Seminar', 'Conference', 'Cultural', 'Sports', 'Technical', 'Other']),
  body('startDate').isISO8601().toDate().withMessage('Enter a valid start date'),
  body('endDate').isISO8601().toDate().withMessage('Enter a valid end date')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('venue').trim().notEmpty().withMessage('Venue is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
];

router.get('/', getEvents);
router.get('/categories', getCategories);
router.get('/:id', getEventById);

// Admin only
router.post('/', protect, adminOnly, upload.single('image'), eventValidation, createEvent);
router.put('/:id', protect, adminOnly, upload.single('image'), updateEvent);
router.delete('/:id', protect, adminOnly, deleteEvent);
router.put('/:id/status', protect, adminOnly, updateEventStatus);

export default router;