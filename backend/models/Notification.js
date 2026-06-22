import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'registration_confirmed',
      'registration_cancelled',
      'waitlist_promoted',
      'event_reminder',
      'payment_received',
    'event_created',
    'event_updated',
    'check_in',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  link: { type: String },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);
