import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'waitlisted', 'attended', 'pending_payment'],
      default: 'confirmed',
    },
    qrCode: {
      type: String,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
      submittedAt: Date,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'free'],
      default: 'free',
    },
    paymentId: {
      type: String,
    },
    ticketNumber: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate registrations
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

// Auto-generate ticket number
registrationSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    // Generate a more robust unique ticket number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.ticketNumber = `TKT-${timestamp}-${random}`;
  }
  next();
});

registrationSchema.index({ user: 1, status: 1, createdAt: -1 });
registrationSchema.index({ event: 1, status: 1, createdAt: -1 });
registrationSchema.index({ event: 1, status: 1, createdAt: 1 }); // For waitlist
registrationSchema.index({ status: 1, checkedIn: 1, event: 1 });
registrationSchema.index({ paymentStatus: 1, status: 1 });
registrationSchema.index({ status: 1, createdAt: 1 }); // For cleanup
registrationSchema.index({ 'feedback.rating': 1, event: 1 });
registrationSchema.index({ createdAt: -1, event: 1 });

export default mongoose.model('Registration', registrationSchema);