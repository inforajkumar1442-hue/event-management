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
    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
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

// ✅ FIX: Spots left
eventSchema.virtual('spotsLeft').get(function () {
  return Math.max(0, this.capacity - (this.registeredCount || 0));
});

// ✅ FIX: Is full
eventSchema.virtual('isFull').get(function () {
  return (this.registeredCount || 0) >= this.capacity;
});

// ✅ FIX: Date virtual (for backward compatibility with frontend expecting 'date')
eventSchema.virtual('date').get(function () {
  return this.startDate;
});

// ✅ FIX: Time virtual (for backward compatibility)
eventSchema.virtual('time').get(function () {
  if (this.startTime && this.endTime) {
    return `${this.startTime} - ${this.endTime}`;
  }
  return this.startTime || 'Time TBA';
});

// ✅ FIX: Duration in minutes (useful for reports)
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
// INSTANCE METHODS
// ==============================================

// Check if event has available spots
eventSchema.methods.hasAvailableSpots = function() {
  return this.registeredCount < this.capacity;
};

// Get number of available spots
eventSchema.methods.getAvailableSpots = function() {
  return Math.max(0, this.capacity - this.registeredCount);
};

// Increment registered count (with validation)
eventSchema.methods.incrementRegisteredCount = async function() {
  if (!this.hasAvailableSpots()) {
    throw new Error('Event is at full capacity');
  }
  this.registeredCount += 1;
  await this.save();
  return this.registeredCount;
};

// Decrement registered count
eventSchema.methods.decrementRegisteredCount = async function() {
  if (this.registeredCount > 0) {
    this.registeredCount -= 1;
    await this.save();
  }
  return this.registeredCount;
};

// Soft delete method
eventSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = 'cancelled';
  await this.save();
};

// Restore soft deleted event
eventSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = null;
  await this.save();
};

// ==============================================
// STATIC METHODS
// ==============================================

// Get upcoming events
eventSchema.statics.getUpcoming = function(limit = 10) {
  return this.find({ 
    status: 'upcoming', 
    isPublished: true, 
    isDeleted: false,
    startDate: { $gte: new Date() }
  })
  .sort('startDate')
  .limit(limit);
};

// Get popular events (most registered)
eventSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isPublished: true, isDeleted: false })
    .sort('-registeredCount')
    .limit(limit);
};

// ==============================================
// INDEXES FOR OPTIMAL QUERIES
// ==============================================

// Text search index
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

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
eventSchema.index({ isDeleted: 1, status: 1, startDate: -1 }); // For soft delete queries
eventSchema.index({ createdBy: 1, startDate: -1 }); // For user's events
eventSchema.index({ isPublished: 1, status: 1, startDate: 1 }); // For public event listing

// Soft delete indexes
eventSchema.index({ isDeleted: 1, status: 1 });
eventSchema.index({ isDeleted: 1, startDate: -1 });

// ==============================================
// QUERY MIDDLEWARE
// ==============================================

// Automatically exclude soft-deleted events unless includeDeleted option is true
eventSchema.pre(/^find/, function() {
  // Only apply if not explicitly told to include deleted
  if (this.getOptions().includeDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
});

// Populate createdBy on all find queries by default (optional)
eventSchema.pre(/^find/, function() {
  this.populate('createdBy', 'name email');
});

export default mongoose.model('Event', eventSchema);