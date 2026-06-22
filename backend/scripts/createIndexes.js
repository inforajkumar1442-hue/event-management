import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';

dotenv.config();

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');

    await Event.init();
    logger.info('Event indexes created');

    await Registration.init();
    logger.info('Registration indexes created');

    await User.init();
    logger.info('User indexes created');

    logger.info('All database indexes created successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error creating indexes: ' + error.message);
    process.exit(1);
  }
};

createIndexes();