import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import logger from '../utils/logger.js';

// @GET /api/staff/today-events
// Get all events happening today
export const getTodayEvents = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const query = {
      startDate: {
        $gte: today,
        $lt: tomorrow
      },
      isPublished: true,
      status: { $in: ['upcoming', 'ongoing'] }
    };

    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .sort('startTime');

    logger.info(`Staff: Found ${events.length} events for today`);

    res.json({
      success: true,
      events,
      count: events.length,
      date: today.toISOString().split('T')[0]
    });
  } catch (error) {
    logger.error('Error fetching today\'s events:', error);
    res.status(500).json({ message: 'Error fetching events', error: error.message });
  }
};

// @GET /api/staff/events/:eventId/attendees
// Get attendees for a specific event (today's events only)
export const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists and is today
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.startDate);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() !== today.getTime()) {
      return res.status(403).json({ 
        message: 'Staff can only view attendees for today\'s events' 
      });
    }

    const registrations = await Registration.find({
      event: eventId,
      status: { $in: ['confirmed', 'attended'] }
    })
    .populate('user', 'name email phone department')
    .sort('user.name');

    res.json({
      success: true,
      event: {
        _id: event._id,
        title: event.title,
        venue: event.venue,
        startTime: event.startTime,
        endTime: event.endTime
      },
      attendees: registrations,
      total: registrations.length,
      checkedIn: registrations.filter(r => r.checkedIn).length
    });
  } catch (error) {
    logger.error('Error fetching attendees:', error);
    res.status(500).json({ message: 'Error fetching attendees' });
  }
};

// @POST /api/staff/events/:eventId/checkin/:registrationId
// Check in an attendee (for today's events only)
export const checkInAttendee = async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;
    
    // Verify event is today
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.startDate);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() !== today.getTime()) {
      return res.status(403).json({ 
        message: 'Staff can only check in attendees for today\'s events' 
      });
    }

    const registration = await Registration.findById(registrationId)
      .populate('user', 'name email');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    if (registration.event.toString() !== eventId) {
      return res.status(400).json({ message: 'Registration does not belong to this event' });
    }

    if (registration.status !== 'confirmed') {
      return res.status(400).json({ 
        message: `Cannot check in: registration status is ${registration.status}` 
      });
    }

    if (registration.checkedIn) {
      return res.status(400).json({ message: 'Attendee already checked in' });
    }

    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    registration.status = 'attended';
    await registration.save();

    logger.info(`Staff ${req.user.email} checked in ${registration.user.email} for ${event.title}`);

    res.json({
      success: true,
      message: `${registration.user.name} checked in successfully`,
      attendee: {
        name: registration.user.name,
        email: registration.user.email,
        checkedInAt: registration.checkedInAt
      }
    });
  } catch (error) {
    logger.error('Error checking in attendee:', error);
    res.status(500).json({ message: 'Failed to check in attendee' });
  }
};

// @POST /api/staff/events/:eventId/checkin-by-ticket
// Check in attendee by ticket number
export const checkInByTicketNumber = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticketNumber } = req.body;

    if (!ticketNumber) {
      return res.status(400).json({ message: 'Ticket number is required' });
    }

    // Verify event is today
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.startDate);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() !== today.getTime()) {
      return res.status(403).json({ 
        message: 'Staff can only check in attendees for today\'s events' 
      });
    }

    const registration = await Registration.findOne({
      ticketNumber: ticketNumber.toUpperCase(),
      event: eventId
    }).populate('user', 'name email');

    if (!registration) {
      return res.status(404).json({ message: 'Invalid ticket number' });
    }

    if (registration.status !== 'confirmed') {
      return res.status(400).json({ 
        message: `Cannot check in: ticket status is ${registration.status}` 
      });
    }

    if (registration.checkedIn) {
      return res.status(400).json({ message: 'Already checked in' });
    }

    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    registration.status = 'attended';
    await registration.save();

    logger.info(`Staff ${req.user.email} checked in ${registration.user.email} via ticket number`);

    res.json({
      success: true,
      message: `${registration.user.name} checked in successfully`,
      attendee: {
        name: registration.user.name,
        email: registration.user.email,
        checkedInAt: registration.checkedInAt
      }
    });
  } catch (error) {
    logger.error('Error checking in by ticket:', error);
    res.status(500).json({ message: 'Failed to check in attendee' });
  }
};

// @GET /api/staff/stats
// Get staff dashboard stats (for today)
export const getStaffStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = await Event.find({
      startDate: {
        $gte: today,
        $lt: tomorrow
      },
      isPublished: true
    });

    const stats = await Registration.aggregate([
      {
        $match: {
          event: { $in: todayEvents.map(e => e._id) },
          status: { $in: ['confirmed', 'attended'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAttendees: { $sum: 1 },
          checkedInCount: { $sum: { $cond: ['$checkedIn', 1, 0] } }
        }
      }
    ]);

    const totalAttendees = stats[0]?.totalAttendees || 0;
    const checkedInCount = stats[0]?.checkedInCount || 0;

    res.json({
      success: true,
      stats: {
        todayEventsCount: todayEvents.length,
        totalAttendees,
        checkedInCount,
        remainingToCheckIn: totalAttendees - checkedInCount,
        checkInRate: totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 100) : 0
      },
      events: todayEvents.map(e => ({
        _id: e._id,
        title: e.title,
        startTime: e.startTime,
        venue: e.venue
      }))
    });
  } catch (error) {
    logger.error('Error fetching staff stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};