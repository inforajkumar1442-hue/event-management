// backend/scripts/cleanupPendingPayments.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Registration from '../models/Registration.js';
import logger from '../utils/logger.js';

dotenv.config();

const cleanupPendingPayments = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const result = await Registration.deleteMany({
      status: 'pending_payment',
      createdAt: { $lt: thirtyMinutesAgo }
    });
    
    logger.info(`✅ Cleaned up ${result.deletedCount} stale pending registrations`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error cleaning up pending payments:', error);
    process.exit(1);
  }
};

cleanupPendingPayments();