import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Workshop', 'Seminar', 'Conference', 'Cultural', 'Sports', 'Technical', 'Other'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function(value) {
          if (!this.startDate) return true;
          return value >= this.startDate;
        },
        message: 'End date must be after or equal to start date',
      },
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)'],
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: [0, 'Registered count cannot be negative'],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    isFree: {
      type: Boolean,
      default: true,
    },
    ticketTypes: [
      {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        price: { type: Number, default: 0, min: 0 },
        capacity: { type: Number, required: true, min: 1 },
        registeredCount: { type: Number, default: 0, min: 0 },
        isFree: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
      },
    ],
    tags: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    speakers: [
      {
        name: { type: String, trim: true },
        designation: { type: String, trim: true },
        bio: { type: String, trim: true },
      },
    ],
    agenda: [
      {
        time: { type: String },
        activity: { type: String },
      },
    ],
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ==============================================
// VIRTUAL FIELDS (for frontend compatibility)
// ==============================================

// Spots left
eventSchema.virtual('spotsLeft').get(function () {
  if (this.ticketTypes && this.ticketTypes.length > 0) {
    const total = this.ticketTypes.reduce((s, t) => s + t.capacity, 0);
    const registered = this.ticketTypes.reduce((s, t) => s + (t.registeredCount || 0), 0);
    return Math.max(0, total - registered);
  }
  return Math.max(0, this.capacity - (this.registeredCount || 0));
});

// Is full
eventSchema.virtual('isFull').get(function () {
  if (this.ticketTypes && this.ticketTypes.length > 0) {
    const total = this.ticketTypes.reduce((s, t) => s + t.capacity, 0);
    const registered = this.ticketTypes.reduce((s, t) => s + (t.registeredCount || 0), 0);
    return registered >= total;
  }
  return (this.registeredCount || 0) >= this.capacity;
});

// Date virtual (for backward compatibility with frontend expecting 'date')
eventSchema.virtual('date').get(function () {
  return this.startDate;
});

// Time virtual (for backward compatibility)
eventSchema.virtual('time').get(function () {
  if (this.startTime && this.endTime) {
    return `${this.startTime} - ${this.endTime}`;
  }
  return this.startTime || 'Time TBA';
});

// Duration in minutes (useful for reports)
eventSchema.virtual('durationMinutes').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  const diff = this.endDate - this.startDate;
  return Math.round(diff / (1000 * 60));
});

// ==============================================
// PRE-SAVE MIDDLEWARE
// ==============================================

// Auto-set isFree based on price
eventSchema.pre('save', function(next) {
  if (this.price === 0 || !this.price) {
    this.isFree = true;
  } else {
    this.isFree = false;
  }
  next();
});

// Auto-update status based on dates
eventSchema.pre('save', function(next) {
  const now = new Date();
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  
  // Don't override cancelled status
  if (this.status === 'cancelled') {
    return next();
  }
  
  if (endDate < now) {
    this.status = 'completed';
  } else if (startDate <= now && endDate >= now) {
    this.status = 'ongoing';
  } else if (startDate > now) {
    this.status = 'upcoming';
  }
  
  next();
});

// ==============================================
// INDEXES FOR OPTIMAL QUERIES
// ==============================================

// Compound indexes for common queries
eventSchema.index({ startDate: 1, category: 1, status: 1 });
eventSchema.index({ status: 1, startDate: -1 });
eventSchema.index({ status: 1, isPublished: 1, startDate: 1 });
eventSchema.index({ category: 1, status: 1, startDate: -1 });
eventSchema.index({ createdBy: 1, startDate: -1 });
eventSchema.index({ _id: 1, capacity: 1, registeredCount: 1 });
eventSchema.index({ isFree: 1, status: 1, startDate: 1 });
eventSchema.index({ endDate: 1, status: 1 });
eventSchema.index({ isPublished: 1, status: 1, startDate: 1 });
eventSchema.index({ createdAt: -1 });

// Text index for full-text search
eventSchema.index({ title: 'text', description: 'text', tags: 'text', venue: 'text' });

export default mongoose.model('Event', eventSchema);