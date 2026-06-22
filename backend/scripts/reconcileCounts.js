import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import logger from '../utils/logger.js';

dotenv.config();

const reconcile = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');

    const events = await Event.find({});

    let totalFixed = 0;

    for (const event of events) {
      const actualConfirmed = await Registration.countDocuments({
        event: event._id,
        status: { $in: ['confirmed', 'attended'] },
      });

      let needsUpdate = false;

      if (event.ticketTypes && event.ticketTypes.length > 0) {
        for (let i = 0; i < event.ticketTypes.length; i++) {
          const tt = event.ticketTypes[i];
          const actualPerType = await Registration.countDocuments({
            event: event._id,
            ticketTypeName: tt.name,
            status: { $in: ['confirmed', 'attended'] },
          });

          if (tt.registeredCount !== actualPerType) {
            logger.info(`  Ticket type "${tt.name}": ${tt.registeredCount} → ${actualPerType}`);
            event.ticketTypes[i].registeredCount = actualPerType;
            needsUpdate = true;
          }
        }
      }

      const mismatchedEventCount = event.registeredCount !== actualConfirmed;
      if (mismatchedEventCount || needsUpdate) {
        if (mismatchedEventCount) {
          logger.info(`Event "${event.title}" (${event._id}): registeredCount ${event.registeredCount} → ${actualConfirmed}`);
          event.registeredCount = actualConfirmed;
        }
        await event.save();
        totalFixed++;
      }
    }

    logger.info(`Reconciliation complete — ${totalFixed} events fixed`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Reconciliation failed:', error.message);
    process.exit(1);
  }
};

reconcile();
