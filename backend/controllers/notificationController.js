import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';

export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('event', 'title'),
      Notification.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error('Error fetching notifications: ' + err.message);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });
    res.json({ count });
  } catch (err) {
    logger.error('Error fetching unread count: ' + err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ notification });
  } catch (err) {
    logger.error('Error marking notification as read: ' + err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    logger.error('Error marking all as read: ' + err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    logger.error('Error deleting notification: ' + err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createNotification = async ({ user, type, title, message, event, link }) => {
  try {
    await Notification.create({ user, type, title, message, event, link });
  } catch (err) {
    logger.error('Failed to create notification: ' + err.message);
  }
};
