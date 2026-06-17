// backend/controllers/eventController.js - Complete fixed version with Winston logger

import { validationResult } from 'express-validator';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

// @GET /api/events
export const getEvents = async (req, res) => {
  try {
    const {
      search, category, status, startDate, endDate, page = 1, limit = 12, sort = '-startDate',
    } = req.query;

    const query = { isPublished: true };

    // SIMPLIFIED SEARCH HANDLING - More reliable
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Use regex search on title and description (always works)
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } },
      ];
      
      logger.debug(`🔍 Searching for: ${searchTerm}`);
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
    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    logger.info(`✅ Found ${events.length} events out of ${total} total`);

    res.json({
      events,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
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
    // ✅ Sanitize input data
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
      eventData.imageUrl = `${process.env.PORT}/uploads/${req.file.filename}`;
      logger.debug(`Image uploaded for event: ${req.file.filename}`);
    }

    if (eventData.price && eventData.price > 0) {
      eventData.isFree = false;
    }

    const event = await Event.create(eventData);
    logger.info(`Event created successfully: ${event.title} (${event._id}) by ${req.user.email}`);
    
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
    if (req.file) {
      updates.imageUrl = `${process.env.PORT}/uploads/${req.file.filename}`;
      logger.debug(`Image updated for event ${req.params.id}: ${req.file.filename}`);
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    logger.info(`Event updated successfully: ${updated.title} (${updated._id})`);
    res.json({ message: 'Event updated', event: updated });
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
    const categories = ['Workshop', 'Seminar', 'Conference', 'Cultural', 'Sports', 'Technical', 'Other'];
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
      { new: true }
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