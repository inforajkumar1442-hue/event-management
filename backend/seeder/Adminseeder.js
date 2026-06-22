/**
 * Admin Seeder
 *
 * Creates an initial admin account. Credentials are read from environment
 * variables so they are never hardcoded in source code.
 *
 * Usage:
 *   ADMIN_NAME="Admin" ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="secret123" \
 *     node ./seeder/adminSeeder.js
 *
 * Or add them to your .env file and run:
 *   npm run admin:seeder
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import logger from '../utils/logger.js';

dotenv.config();

const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const createAdmin = async () => {
  logger.info('🔐 Admin Seeder starting...');
  logger.debug(`Admin name: ${ADMIN_NAME}`);
  
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    logger.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in your .env file');
    logger.info('💡 Tip: Add ADMIN_EMAIL=admin@example.com and ADMIN_PASSWORD=yourpassword to your .env file');
    process.exit(1);
  }

  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('✅ MongoDB connected successfully');

    // Check if admin already exists
    logger.debug(`Checking if admin exists with email: ${ADMIN_EMAIL}`);
    const adminExists = await User.findOne({ email: ADMIN_EMAIL });
    
    if (adminExists) {
      logger.warn(`⚠️ Admin already exists with email: ${ADMIN_EMAIL}`);
      logger.info('No action taken. Admin user already present.');
      await mongoose.disconnect();
      logger.info('Database connection closed');
      process.exit(0);
    }

    // Create new admin user
    logger.info('Creating new admin user...');
    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD, // hashed automatically by the pre-save hook
      role: 'admin',
      isActive: true,
      department: 'Administration',
    });

    logger.info('✅ Admin created successfully!');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`📛 Name  : ${admin.name}`);
    logger.info(`📧 Email : ${admin.email}`);
    logger.info(`👑 Role  : ${admin.role}`);
    logger.info(`🔒 Status: Active`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('💡 You can now log in with these credentials');
    
    // Disconnect from database
    await mongoose.disconnect();
    logger.info('Database connection closed');
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error creating admin:', error.message);
    
    // Log more details based on error type
    if (error.code === 11000) {
      logger.error('Duplicate key error. Admin may already exist with this email.');
    } else if (error.name === 'ValidationError') {
      logger.error('Validation error:', error.errors);
    } else if (error.name === 'MongoNetworkError') {
      logger.error('Network error. Please check your MongoDB connection string.');
    }
    
    // Attempt to disconnect if connected
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      logger.info('Database connection closed');
    }
    
    process.exit(1);
  }
};

// Handle process interrupts
process.on('SIGINT', async () => {
  logger.warn('Process interrupted. Cleaning up...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    logger.info('Database connection closed');
  }
  process.exit(0);
});

// Run the seeder
createAdmin();