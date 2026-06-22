import { validationResult } from 'express-validator';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';
import { escapeRegex, EVENT_CATEGORIES, MAX_PAGINATION_LIMIT } from '../constants.js';

// @GET /api/events
export const getEvents = async (req, res) => {
  try {
    const {
      search, category, status, startDate, endDate, page = 1, limit, sort = '-startDate',
    } = req.query;

    const query = { isPublished: true };

    // Enforce pagination limits
    const safeLimit = Math.min(parseInt(limit) || 12, MAX_PAGINATION_LIMIT);

    // FULL-TEXT SEARCH — Uses MongoDB text index for ranked results
    if (search && search.trim()) {
      const searchTerm = search.trim();
      if (searchTerm.length >= 2) {
        query.$text = { $search: searchTerm };
        logger.debug(`🔍 Full-text search for: ${searchTerm}`);
      } else {
        const escaped = escapeRegex(searchTerm);
        query.$or = [
          { title: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
          { tags: { $in: [new RegExp(escaped, 'i')] } },
        ];
        logger.debug(`🔍 Regex fallback for short query: ${searchTerm}`);
      }
    }
    
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) {
        query.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.startDate.$lte = new Date(endDate);
      }
    }

    logger.debug(`📊 Query: ${JSON.stringify(query, null, 2)}`);

    const total = await Event.countDocuments(query);

    let eventsQuery = Event.find(query);

    if (query.$text) {
      eventsQuery = eventsQuery
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
    } else {
      eventsQuery = eventsQuery.sort(sort);
    }

    const events = await eventsQuery
      .populate('createdBy', 'name email')
      .skip((page - 1) * safeLimit)
      .limit(safeLimit);

    logger.info(`✅ Found ${events.length} events out of ${total} total`);

    res.json({
      events,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / safeLimit),
        limit: safeLimit,
      },
    });
  } catch (error) {
    logger.error('❌ Error in getEvents:', error);
    res.status(500).json({ message: 'Error fetching events', error: error.message });
  }
};

// @GET /api/events/:id
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name email');
    if (!event) {
      logger.warn(`Event not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ event });
  } catch (error) {
    logger.error(`Error fetching event ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error fetching event' });
  }
};

// @POST /api/events  (Admin only)
export const createEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Event creation validation failed:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Sanitize input data
    const eventData = { ...req.body, createdBy: req.user._id };
    
    if (eventData.title) {
      eventData.title = eventData.title.trim().replace(/[<>]/g, '');
    }
    if (eventData.description) {
      eventData.description = eventData.description.trim().replace(/[<>]/g, '');
    }
    if (eventData.venue) {
      eventData.venue = eventData.venue.trim().replace(/[<>]/g, '');
    }

    if (req.file) {
      eventData.imageUrl = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
      logger.debug(`Image uploaded for event: ${req.file.filename}`);
    }

    if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
      eventData.ticketTypes = eventData.ticketTypes.map(t => ({
        ...t,
        price: Number(t.price) || 0,
        capacity: Number(t.capacity) || 1,
        isFree: Number(t.price) === 0,
      }));
      eventData.isFree = eventData.ticketTypes.every(t => t.isFree);
      eventData.price = Math.min(...eventData.ticketTypes.map(t => t.price));
    } else if (eventData.price !== undefined) {
      eventData.isFree = Number(eventData.price) === 0;
    }

    const event = await Event.create(eventData);
    logger.info(`Event created successfully: ${event.title} (${event._id}) by ${req.user.email}`);

    // Broadcast notification to all users except the creator
    const eventDate = event.startDate
      ? new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'soon';
    User.find({ _id: { $ne: req.user._id } }).select('_id').lean()
      .then(users => {
        if (users.length === 0) return;
        const notifications = users.map(u => ({
          user: u._id,
          type: 'event_created',
          title: 'New Event Coming Up',
          message: `"${event.title}" on ${eventDate} — register now!`,
          event: event._id,
          link: `/events/${event._id}`,
        }));
        return Notification.insertMany(notifications);
      })
      .then(result => {
        if (result) logger.info(`📢 New event notification sent to ${result.length} users`);
      })
      .catch(err => logger.error('Failed to broadcast event notification:', err.message));

    res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    logger.error('Error creating event:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
};

// @PUT /api/events/:id  (Admin only)
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      logger.warn(`Event not found for update: ${req.params.id}`);
      return res.status(404).json({ message: 'Event not found' });
    }

    const updates = { ...req.body };
    if (updates.title) updates.title = updates.title.trim().replace(/[<>]/g, '');
    if (updates.description) updates.description = updates.description.trim().replace(/[<>]/g, '');
    if (updates.venue) updates.venue = updates.venue.trim().replace(/[<>]/g, '');
    if (req.file) {
      updates.imageUrl = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
      logger.debug(`Image updated for event ${req.params.id}: ${req.file.filename}`);
    }

    if (updates.ticketTypes && updates.ticketTypes.length > 0) {
      updates.ticketTypes = updates.ticketTypes.map(t => ({
        ...t,
        price: Number(t.price) || 0,
        capacity: Number(t.capacity) || 1,
        isFree: Number(t.price) === 0,
      }));
      updates.isFree = updates.ticketTypes.every(t => t.isFree);
      updates.price = Math.min(...updates.ticketTypes.map(t => t.price));
    } else if (updates.price !== undefined) {
      updates.isFree = Number(updates.price) === 0;
    }

    Object.assign(event, updates);
    await event.save();
    logger.info(`Event updated successfully: ${event.title} (${event._id})`);
    res.json({ message: 'Event updated', event });
  } catch (error) {
    logger.error(`Error updating event ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error updating event' });
  }
};

// @DELETE /api/events/:id  (Admin only)
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      logger.warn(`Event not found for deletion: ${req.params.id}`);
      return res.status(404).json({ message: 'Event not found' });
    }

    // Cancel all registrations
    const cancelResult = await Registration.updateMany(
      { event: req.params.id }, 
      { status: 'cancelled' }
    );
    
    await event.deleteOne();

    logger.info(`Event deleted: ${event.title} (${event._id}) - Cancelled ${cancelResult.modifiedCount} registrations`);
    res.json({ message: 'Event deleted and registrations cancelled' });
  } catch (error) {
    logger.error(`Error deleting event ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error deleting event' });
  }
};

// @GET /api/events/categories/list
export const getCategories = async (req, res) => {
  try {
    const categories = EVENT_CATEGORIES;
    res.json({ categories });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

// @PUT /api/events/:id/status  (Admin only)
export const updateEventStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!event) {
      logger.warn(`Event not found for status update: ${req.params.id}`);
      return res.status(404).json({ message: 'Event not found' });
    }
    
    logger.info(`Event status updated: ${event.title} (${event._id}) → ${status}`);
    res.json({ message: 'Event status updated', event });
  } catch (error) {
    logger.error(`Error updating event status for ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error updating event status' });
  }
};