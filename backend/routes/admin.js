import express from 'express';
import {
  getDashboardStats, getAllUsers, toggleUserStatus, changeUserRole,
  getEventRegistrations, exportEventRegistrations,
  sendEventReminderToAll, deleteUser,
  createStaff, getAllStaff, deleteStaff,
  toggleStaffStatus,
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';
const router = express.Router();
router.use(protect, adminOnly);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:id/toggle', toggleUserStatus);
router.put('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser);
router.get('/events/:id/registrations', getEventRegistrations);
router.get('/events/:id/export', exportEventRegistrations);
router.post('/events/:id/send-reminder', sendEventReminderToAll);

// Staff management routes
router.post('/users/staff', createStaff);
router.get('/users/staff', getAllStaff);
router.delete('/users/staff/:id', deleteStaff);
router.put('/users/staff/:id/toggle', toggleStaffStatus);

export default router;