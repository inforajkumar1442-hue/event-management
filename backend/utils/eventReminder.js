import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import logger from './logger.js';

export async function sendEventReminders() {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [upcomingEvents, lowCapacityEvents, todayEvents] = await Promise.all([
      // Events starting within 3 days (excluding today)
      Event.find({
        startDate: { $gte: tomorrow, $lte: threeDaysLater },
        status: { $in: ['upcoming', 'ongoing'] },
        isPublished: true,
      }).select('_id title startDate capacity registeredCount'),

      // Events where remaining spots < 20% of capacity
      Event.find({
        status: { $in: ['upcoming', 'ongoing'] },
        isPublished: true,
        $expr: {
          $lt: [
            { $subtract: ['$capacity', '$registeredCount'] },
            { $divide: ['$capacity', 5] },
          ],
        },
        registeredCount: { $gt: 0 },
      }).select('_id title startDate capacity registeredCount'),

      // Events happening today
      Event.find({
        startDate: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
        status: { $in: ['upcoming', 'ongoing'] },
        isPublished: true,
      }).select('_id title startDate'),
    ]);

    let totalNotifications = 0;

    // 1️⃣ Send "event is soon" reminders
    for (const event of upcomingEvents) {
      const registrations = await Registration.find({
        event: event._id,
        status: 'confirmed',
      }).select('user').lean();

      if (registrations.length === 0) continue;

      const dateStr = new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const spotsLeft = (event.capacity || 0) - (event.registeredCount || 0);

      const notifications = registrations.map(r => ({
        user: r.user,
        type: 'event_reminder',
        title: 'Event Coming Soon',
        message: `"${event.title}" is on ${dateStr}${spotsLeft > 0 ? ` — only ${spotsLeft} spots left!` : ''}`,
        event: event._id,
        link: `/events/${event._id}`,
      }));

      await Notification.insertMany(notifications);
      totalNotifications += notifications.length;
      logger.info(`📅 Reminder sent for "${event.title}" — ${notifications.length} users`);
    }

    // 2️⃣ Send "limited spots" alerts to registered users
    for (const event of lowCapacityEvents) {
      // Skip if already covered by upcoming check (avoid duplicates)
      if (upcomingEvents.some(e => e._id.equals(event._id))) continue;

      const registrations = await Registration.find({
        event: event._id,
        status: 'confirmed',
      }).select('user').lean();

      if (registrations.length === 0) continue;

      const spotsLeft = (event.capacity || 0) - (event.registeredCount || 0);
      if (spotsLeft <= 0) continue;

      const notifications = registrations.map(r => ({
        user: r.user,
        type: 'event_reminder',
        title: 'Limited Spots Remaining',
        message: `Only ${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left for "${event.title}" — don't miss out!`,
        event: event._id,
        link: `/events/${event._id}`,
      }));

      await Notification.insertMany(notifications);
      totalNotifications += notifications.length;
      logger.info(`⚠️ Low capacity alert for "${event.title}" — ${notifications.length} users`);
    }

    // 3️⃣ Send "happening today" reminders
    for (const event of todayEvents) {
      const registrations = await Registration.find({
        event: event._id,
        status: 'confirmed',
      }).select('user').lean();

      if (registrations.length === 0) continue;

      const notifications = registrations.map(r => ({
        user: r.user,
        type: 'event_reminder',
        title: 'Happening Today!',
        message: `"${event.title}" is happening today — see you there!`,
        event: event._id,
        link: `/events/${event._id}`,
      }));

      await Notification.insertMany(notifications);
      totalNotifications += notifications.length;
      logger.info(`🎉 Today event reminder for "${event.title}" — ${notifications.length} users`);
    }

    logger.info(`✅ Event reminders complete — ${totalNotifications} notifications sent`);

    // Also broadcast upcoming events to users who haven't registered (all users)
    const allUpcomingForNonRegistrants = upcomingEvents.filter(e => {
      const spotsLeft = (e.capacity || 0) - (e.registeredCount || 0);
      return spotsLeft > 0;
    });

    if (allUpcomingForNonRegistrants.length > 0) {
      const allUsers = await User.find()
        .select('_id').lean();

      for (const event of allUpcomingForNonRegistrants) {
        const alreadyRegistered = await Registration.distinct('user', {
          event: event._id,
          status: { $in: ['confirmed', 'attended'] },
        });

        const eligibleUsers = allUsers.filter(
          u => !alreadyRegistered.some(r => r.toString() === u._id.toString())
        );

        if (eligibleUsers.length === 0) continue;

        const dateStr = new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const spotsLeft = (event.capacity || 0) - (event.registeredCount || 0);

        const notifications = eligibleUsers.map(u => ({
          user: u._id,
          type: 'event_reminder',
          title: 'Spots Available',
          message: `"${event.title}" on ${dateStr}${spotsLeft > 0 ? ` — ${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} open!` : ''}`,
          event: event._id,
          link: `/events/${event._id}`,
        }));

        await Notification.insertMany(notifications);
        totalNotifications += notifications.length;
        logger.info(`📢 Broadcast "${event.title}" to ${notifications.length} unregistered users`);
      }
    }

    return totalNotifications;
  } catch (error) {
    logger.error('❌ Event reminder error:', error.message);
  }
}
