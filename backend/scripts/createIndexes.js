import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';

dotenv.config();

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create indexes for Event
    await Event.init();
    console.log('✅ Event indexes created');

    // Create indexes for Registration
    await Registration.init();
    console.log('✅ Registration indexes created');

    // Create indexes for User
    await User.init();
    console.log('✅ User indexes created');

    console.log('All database indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
};

createIndexes();