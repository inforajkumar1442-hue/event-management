import express from 'express';
import {
  getDashboardStats, getAllUsers, toggleUserStatus, changeUserRole,
  getEventRegistrations, exportEventRegistrations,
  sendEventReminderToAll, deleteUser,
  createStaff, getAllStaff, deleteStaff,
  toggleStaffStatus,  // ← ADD THIS IMPORT
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';
import { sendSMS } from '../utils/sms.js';


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
router.post('/test-sms', protect, adminOnly, async (req, res) => {
  const { phone, message } = req.body;
  
  if (!phone) {
    return res.status(400).json({ message: 'Phone number required' });
  }
  
  const testMessage = message || '🎉 Test SMS from EventGather! Your event management system is working perfectly.';
  
  try {
    const result = await sendSMS(phone, testMessage);
    res.json({ 
      success: result,
      message: result ? 'SMS sent successfully!' : 'SMS failed to send - Check Twilio credentials'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error sending SMS: ' + error.message 
    });
  }
});

// Staff management routes
router.post('/users/staff', createStaff);
router.get('/users/staff', getAllStaff);
router.delete('/users/staff/:id', deleteStaff);
router.put('/users/staff/:id/toggle', toggleStaffStatus);

export default router;