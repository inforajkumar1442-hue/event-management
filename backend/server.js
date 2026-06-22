import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { stream } from './utils/logger.js';
import cron from 'node-cron';
import { sendEventReminders } from './utils/eventReminder.js';
import { protect } from './middleware/auth.js';
import { adminOnly } from './middleware/admin.js';
import staffRoutes from './routes/staff.js';

import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import registrationRoutes from './routes/registrations.js';
import adminRoutes from './routes/admin.js';
import Event from './models/Event.js';
import Registration from './models/Registration.js';
import paymentRoutes from './routes/payments.js';
import notificationRoutes from './routes/notifications.js';
import couponRoutes from './routes/coupons.js';

import User from './models/User.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const uploadsDir = path.join(__dirname, 'uploads');

// ─── CORS Configuration ──────────────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// ─── Security Middleware ────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        frameSrc: ["'none'"],
      },
    } : false,
    frameguard: { action: 'deny' },
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression());
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Shared rate limit handler for logging
const rateLimitHandler = (limiterName) => (req, res, next, options) => {
  logger.warn(`Rate limit exceeded on ${limiterName}: IP ${req.ip}, path ${req.originalUrl}`);
  res.status(429).json(options.message);
};

// Global Rate Limiter for all API routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: rateLimitHandler('global'),
});
app.use('/api/', globalLimiter);

// Auth specific stricter rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('auth'),
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Resend verification rate limiter
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: 'Too many verification requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('resend-verification'),
});
app.use('/api/auth/resend-verification', resendVerificationLimiter);

// Stricter limiter for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many admin requests, please slow down.' },
  skipSuccessfulRequests: false,
  handler: rateLimitHandler('admin'),
});
app.use('/api/admin', adminLimiter);

// Password reset rate limiter (tight — prevents email bombing)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('forgot-password'),
});
app.use('/api/auth/forgot-password', passwordResetLimiter);

// Reset token submission rate limiter (prevents brute force)
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('reset-password'),
});
app.use('/api/auth/reset-password', resetPasswordLimiter);

// ─── General Middleware ─────────────────────────────────────────────────────
// Stripe webhook raw body parsing is handled in payments.js route
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(':method :url :status :response-time ms - :req[X-Request-ID]', { stream }));

// ─── Static Files ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/coupons', couponRoutes);

// Manual trigger for event reminders (admin only)
app.post('/api/admin/trigger-reminders', protect, adminOnly, async (req, res) => {
  try {
    const count = await sendEventReminders();
    res.json({ message: `Reminders sent`, count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send reminders' });
  }
});

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Root Route ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.redirect('https://event-management-git-master-inforajkumar1442-hues-projects.vercel.app/');
});

// ─── 404 Handler for undefined routes ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.stack);

  // Handle multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: 'File too large. Maximum size is 5MB.'
    });
  }

  // Handle multer file type errors
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      message: 'Unexpected file field.'
    });
  }

  // Handle payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      message: 'Request entity too large. Maximum size is 10MB.'
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      message: `Duplicate value for ${field}. Please use a different value.`
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token. Please login again.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired. Please login again.' });
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ message: err.message });
  }

  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Helper Functions ───────────────────────────────────────────────────────
const updateEventStatuses = async () => {
  try {
    // Check if MongoDB is connected first
    if (mongoose.connection.readyState !== 1) {
      logger.warn('MongoDB not connected, skipping event status update');
      return;
    }

    const now = new Date();

    // Update upcoming to ongoing
    const upcomingResult = await Event.updateMany(
      {
        startDate: { $lte: now },
        endDate: { $gte: now },
        status: 'upcoming'
      },
      { status: 'ongoing' }
    );

    // Update ongoing/completed to completed
    const completedResult = await Event.updateMany(
      {
        endDate: { $lt: now },
        status: { $in: ['upcoming', 'ongoing'] }
      },
      { status: 'completed' }
    );

    if (upcomingResult.modifiedCount > 0 || completedResult.modifiedCount > 0) {
      logger.info(`Event statuses updated: ${upcomingResult.modifiedCount} → ongoing, ${completedResult.modifiedCount} → completed`);
    }
  } catch (error) {
    logger.error('Error updating event statuses:', error.message);
    // Don't throw - just log the error
  }
};

// ─── Validate Environment Variables ─────────────────────────────────────────
const validateEnv = () => {
  const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
    logger.error('Please check your .env file');
    process.exit(1);
  }

  // Warn about optional but important variables
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('⚠️ STRIPE_SECRET_KEY missing. Payment features will not work.');
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn('⚠️ Email configuration missing. Email notifications will not work.');
  }

  logger.info('✅ Environment variables validated');
};

// ─── Database Connection and Server Start ───────────────────────────────────
const startServer = async () => {
  try {
    // Validate environment variables first
    validateEnv();

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    logger.info('✅ MongoDB connected successfully');

    // Create indexes if they don't exist
    await Event.init();
    await Registration.init();
    await User.init();
    logger.info('✅ Database indexes verified');

    // Run initial event status update
    await updateEventStatuses();

    // Update event statuses every hour
    setInterval(updateEventStatuses, 60 * 60 * 1000);

    // Schedule event reminders daily at 9:00 AM
    cron.schedule('0 9 * * *', () => {
      logger.info('⏰ Running scheduled event reminders...');
      sendEventReminders();
    });
    logger.info('⏰ Event reminders scheduled daily at 9:00 AM');

    // Also run reminders on startup (with 10s delay to let server settle)
    setTimeout(() => {
      logger.info('⏰ Running startup event reminders...');
      sendEventReminders();
    }, 10000);

    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📁 Uploads directory: ${uploadsDir}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} signal received: closing server...`);

  try {
    await mongoose.disconnect();
    logger.info('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception:', err);
  shutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});