import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import { exportRegistrationsToCSV } from '../utils/csvExport.js';
import { sendEventReminder } from '../utils/email.js';
import logger from '../utils/logger.js';

// @GET /api/admin/stats
export const getDashboardStats = async (req, res) => {
  const [
    totalUsers,
    totalEvents,
    totalRegistrations,
    upcomingEvents,
    recentRegistrations,
    eventsByCategory,
    monthlyRegistrations,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Event.countDocuments(),
    Registration.countDocuments({ status: { $in: ['confirmed', 'attended'] } }),
    Event.countDocuments({ status: 'upcoming', startDate: { $gte: new Date() } }),

    // Fix: populate event with startDate (not the virtual 'date')
    Registration.find({ status: { $in: ['confirmed', 'attended'] } })
      .populate('user', 'name email')
      .populate('event', 'title startDate venue')
      .sort('-createdAt')
      .limit(10),

    Event.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
          status: { $in: ['confirmed', 'attended'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    stats: { totalUsers, totalEvents, totalRegistrations, upcomingEvents },
    recentRegistrations,
    eventsByCategory,
    monthlyRegistrations,
  });
};

// @PUT /api/admin/users/staff/:id/toggle
// Toggle staff member active status
export const toggleStaffStatus = async (req, res) => {
  try {
    // Sanitize ID parameter
    const staffId = req.params.id?.trim();
    
    if (!staffId) {
      return res.status(400).json({ message: 'Invalid staff ID' });
    }
    
    const staff = await User.findById(staffId);
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    if (staff.role !== 'staff') {
      return res.status(400).json({ message: 'User is not a staff member' });
    }

    staff.isActive = !staff.isActive;
    await staff.save();
    
    logger.info(`Admin ${req.user.email} ${staff.isActive ? 'activated' : 'deactivated'} staff: ${staff.email}`);
    
    res.json({
      success: true,
      message: `Staff member ${staff.isActive ? 'activated' : 'deactivated'} successfully`,
      staff
    });
  } catch (error) {
    logger.error('Error toggling staff status:', error);
    res.status(500).json({ message: 'Failed to toggle staff status' });
  }
};

// @GET /api/admin/users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ users, total });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// @PUT /api/admin/users/:id/toggle
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot deactivate admin' });

    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (error) {
    logger.error('Error toggling user status:', error);
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
};

// @PUT /api/admin/users/:id/role
export const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Role updated', user });
  } catch (error) {
    logger.error('Error changing user role:', error);
    res.status(500).json({ message: 'Failed to change user role' });
  }
};

// @GET /api/admin/events/:id/registrations
export const getEventRegistrations = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { event: req.params.id };
    if (status) query.status = status;

    const registrations = await Registration.find(query)
      .populate('user', 'name email department phone')
      .populate('event', 'title startDate venue')
      .sort('-createdAt');

    res.json({ registrations, total: registrations.length });
  } catch (error) {
    logger.error('Error fetching event registrations:', error);
    res.status(500).json({ message: 'Failed to fetch registrations' });
  }
};

// @GET /api/admin/events/:id/export
// Auth is verified via the Authorization header (Bearer token) — no query-param token needed.
export const exportEventRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ event: req.params.id })
      .populate('user', 'name email department phone')
      .populate('event', 'title startDate venue')
      .lean();

    const csv = exportRegistrationsToCSV(registrations);
    const event = await Event.findById(req.params.id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${event?.title || 'event'}-registrations.csv"`,
    );
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting registrations:', error);
    res.status(500).json({ message: 'Failed to export registrations' });
  }
};

// @POST /api/admin/events/:id/send-reminder
export const sendEventReminderToAll = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const registrations = await Registration.find({ event: req.params.id, status: 'confirmed' })
      .populate('user', 'name email');

    await Promise.all(
      registrations.map(reg =>
        sendEventReminder({ to: reg.user.email, userName: reg.user.name, event }),
      ),
    );

    logger.info(`Reminders sent to ${registrations.length} attendees for event: ${event.title}`);
    res.json({ message: `Reminders sent to ${registrations.length} attendees` });
  } catch (error) {
    logger.error('Error sending reminders:', error);
    res.status(500).json({ message: 'Failed to send reminders' });
  }
};

// @DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });

    await Registration.deleteMany({ user: req.params.id });
    await user.deleteOne();
    logger.info(`User deleted: ${user.email}`);
    res.json({ message: 'User deleted' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Create a new staff member (admin only)
export const createStaff = async (req, res) => {
  try {
    let { name, email, password, department, phone } = req.body;
    
    // ADD SANITIZATION
    name = name?.trim().replace(/[<>]/g, '');
    email = email?.toLowerCase().trim();
    department = department?.trim().replace(/[<>]/g, '');
    phone = phone?.trim().replace(/[^0-9+\-\s]/g, '');

    // Validate required fields after sanitization
    if (!name || !email || !password || !department) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Create staff user
    const staff = await User.create({
      name,
      email,
      password,
      department,
      phone,
      role: 'staff',
      isActive: true
    });

    logger.info(`Admin ${req.user.email} created new staff: ${staff.email}`);

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      user: staff
    });
  } catch (error) {
    logger.error('Error creating staff:', error);
    res.status(500).json({ message: 'Failed to create staff member' });
  }
};
// @GET /api/admin/users/staff
// Get all staff members
export const getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' })
      .select('-password')
      .sort('-createdAt');

    res.json({
      success: true,
      staff
    });
  } catch (error) {
    logger.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Failed to fetch staff members' });
  }
};

// @DELETE /api/admin/users/staff/:id
// Delete a staff member (admin only)
export const deleteStaff = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    if (staff.role !== 'staff') {
      return res.status(400).json({ message: 'User is not a staff member' });
    }

    await staff.deleteOne();
    
    logger.info(`Admin ${req.user.email} deleted staff: ${staff.email}`);
    
    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting staff:', error);
    res.status(500).json({ message: 'Failed to delete staff member' });
  }
};