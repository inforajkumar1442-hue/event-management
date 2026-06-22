import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { generateQRCode } from '../utils/qrCode.js';
import { sendRegistrationConfirmation, sendCancellationEmail } from '../utils/email.js';
import { createNotification } from './notificationController.js';
import { generateTicketPDF } from '../utils/pdfTicket.js';
import logger from '../utils/logger.js';

// @POST /api/registrations/:eventId
export const registerForEvent = async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user._id;
  const { ticketTypeName } = req.body;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({ message: 'This event has been cancelled' });
    }

    if (event.status === 'completed') {
      return res.status(400).json({ message: 'This event has already ended' });
    }

    const existingRegistration = await Registration.findOne({
      user: userId,
      event: eventId,
      status: { $in: ['confirmed', 'waitlisted', 'attended'] },
    });

    if (existingRegistration) {
      return res.status(409).json({
        message: existingRegistration.status === 'waitlisted'
          ? 'You are already on the waitlist for this event'
          : 'You are already registered for this event'
      });
    }

    await Registration.deleteMany({
      user: userId,
      event: eventId,
      status: { $in: ['pending_payment', 'cancelled'] },
    });

    const user = await User.findById(userId);

    // Determine price and if payment is needed
    let ticketType = null;
    let price = event.price;
    let isFree = event.isFree;

    if (event.ticketTypes && event.ticketTypes.length > 0) {
      if (!ticketTypeName) {
        return res.status(400).json({ message: 'Please select a ticket type' });
      }
      ticketType = event.ticketTypes.find(t => t.name === ticketTypeName && t.isActive);
      if (!ticketType) {
        return res.status(400).json({ message: 'Invalid ticket type' });
      }
      price = ticketType.price;
      isFree = ticketType.isFree;
    }

    // Atomically check capacity and reserve seat (for both free and paid events)
    let updatedEvent;
    if (ticketType) {
      updatedEvent = await Event.findOneAndUpdate(
        {
          _id: eventId,
          'ticketTypes.name': ticketType.name,
          $expr: { $lt: [{ $arrayElemAt: ['$ticketTypes.registeredCount', { $indexOfArray: ['$ticketTypes.name', ticketType.name] }] }, { $arrayElemAt: ['$ticketTypes.capacity', { $indexOfArray: ['$ticketTypes.name', ticketType.name] }] }] },
        },
        { $inc: { 'ticketTypes.$.registeredCount': 1, registeredCount: 1 } },
        { new: true }
      );
    } else {
      updatedEvent = await Event.findOneAndUpdate(
        { _id: eventId, $expr: { $lt: ['$registeredCount', '$capacity'] } },
        { $inc: { registeredCount: 1 } },
        { new: true }
      );
    }

    let registration;
    let status;
    let message;

    if (!updatedEvent) {
      // For free events, waitlist. For paid events, reject (can't pay for a full event).
      if (!isFree && price > 0) {
        return res.status(400).json({ message: 'Event is full. No spots available for registration.' });
      }
      status = 'waitlisted';
      message = 'Event is full. You have been added to the waitlist.';
    } else if (!isFree && price > 0) {
      // Seat reserved — now require payment to confirm
      status = 'pending_payment';
      message = 'Payment required to complete registration';
    } else {
      status = 'confirmed';
      message = 'Registration successful!';
    }

    registration = await Registration.create({
      user: userId,
      event: eventId,
      status,
      ticketTypeName: ticketType?.name,
      paymentStatus: isFree ? 'free' : 'pending',
    });

    if (status === 'confirmed') {
      const qrData = {
        ticketType: ticketType?.name || 'event',
        attendeeName: user.name,
        userId: userId,
        eventId: eventId,
        eventTitle: event.title,
        registrationId: registration._id,
      };

      const qrCode = await generateQRCode(qrData);
      registration.qrCode = qrCode;
      await registration.save();
    }

    await registration.populate([
      { path: 'user', select: 'name email department phone' },
      { path: 'event', select: 'title startDate startTime endTime venue price isFree capacity registeredCount ticketTypes' },
    ]);

    if (status === 'confirmed') {
      createNotification({
        user: userId,
        type: 'registration_confirmed',
        title: 'Registration Confirmed',
        message: `You are registered for "${event.title}"`,
        event: eventId,
        link: `/events/${eventId}`,
      });

      try {
        await sendRegistrationConfirmation({
          to: user.email,
          userName: user.name,
          event: registration.event,
          ticketNumber: registration.ticketNumber,
          qrCode: registration.qrCode,
          userPhone: user.phone
        });
        logger.info(`Confirmation email sent to ${user.email}`);
      } catch (notifErr) {
        logger.error('Failed to send notifications:', notifErr);
      }
    }

    if (status === 'waitlisted') {
      createNotification({
        user: userId,
        type: 'waitlist_promoted',
        title: 'Added to Waitlist',
        message: `You've been added to the waitlist for "${event.title}"`,
        event: eventId,
        link: `/events/${eventId}`,
      });
    }

    res.status(201).json({
      message,
      registration,
      requiresPayment: status === 'pending_payment',
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// @DELETE /api/registrations/:eventId
export const cancelRegistration = async (req, res) => {
  const { eventId } = req.params;

  try {
    const registration = await Registration.findOne({
      user: req.user._id,
      event: eventId,
      status: { $in: ['confirmed', 'waitlisted'] },
    });

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    if (registration.status === 'confirmed') {
      const ticketTypeName = registration.ticketTypeName;
      if (ticketTypeName) {
        await Event.updateOne(
          { _id: eventId, 'ticketTypes.name': ticketTypeName },
          { $inc: { 'ticketTypes.$.registeredCount': -1, registeredCount: -1 } }
        );
      } else {
        await Event.updateOne(
          { _id: eventId },
          { $inc: { registeredCount: -1 } }
        );
      }

      // Atomically claim the first waitlisted spot (race-condition-safe)
      const waitlisted = await Registration.findOneAndUpdate(
        { event: eventId, status: 'waitlisted' },
        { status: 'confirmed' },
        { sort: { createdAt: 1 }, new: true }
      );

      if (waitlisted) {
        const waitlistedUser = await User.findById(waitlisted.user);

        const eventTitle = (await Event.findById(eventId).select('title'))?.title || 'Event';

        const newQrData = {
          ticketType: waitlisted.ticketTypeName || 'event',
          attendeeName: waitlistedUser.name,
          userId: waitlisted.user,
          eventId,
          eventTitle,
          registrationId: waitlisted._id,
          promotedAt: new Date().toISOString(),
        };
        const newQrCode = await generateQRCode(newQrData);

        waitlisted.qrCode = newQrCode;
        await waitlisted.save();

        // Re-increment capacity for the promoted user's ticket type
        if (waitlisted.ticketTypeName) {
          await Event.updateOne(
            { _id: eventId, 'ticketTypes.name': waitlisted.ticketTypeName },
            { $inc: { 'ticketTypes.$.registeredCount': 1, registeredCount: 1 } }
          );
        } else {
          await Event.updateOne(
            { _id: eventId },
            { $inc: { registeredCount: 1 } }
          );
        }

        await waitlisted.populate([
          { path: 'user', select: 'name email phone' },
          { path: 'event', select: 'title startDate startTime endTime venue' },
        ]);

        createNotification({
          user: waitlisted.user._id,
          type: 'waitlist_promoted',
          title: 'Spot Opened!',
          message: `A spot opened up for "${waitlisted.event.title}" — you've been confirmed!`,
          event: eventId,
          link: `/events/${eventId}`,
        });

        await sendRegistrationConfirmation({
          to: waitlisted.user.email,
          userName: waitlisted.user.name,
          event: waitlisted.event,
          ticketNumber: waitlisted.ticketNumber,
          qrCode: newQrCode,
        }).catch(err => logger.error('Failed to send waitlist promotion email:', err));

        createNotification({
          user: req.user._id,
          type: 'registration_cancelled',
          title: 'Registration Cancelled',
          message: `Your registration for "${waitlisted.event.title}" has been cancelled`,
          event: eventId,
          link: `/events/${eventId}`,
        });

        registration.status = 'cancelled';
        await registration.save();

        return res.json({ message: 'Registration cancelled and waitlisted user promoted' });
      }
    }

    registration.status = 'cancelled';
    await registration.save();

    await registration.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'event', select: 'title' },
    ]);

    createNotification({
      user: req.user._id,
      type: 'registration_cancelled',
      title: 'Registration Cancelled',
      message: `Your registration for "${registration.event.title}" has been cancelled`,
      event: eventId,
      link: `/events/${eventId}`,
    });

    await sendCancellationEmail({
      to: registration.user.email,
      userName: registration.user.name,
      event: registration.event,
    }).catch(err => logger.error('Failed to send cancellation email:', err));

    res.json({ message: 'Registration cancelled' });

  } catch (error) {
    logger.error('Cancellation error:', error);
    res.status(500).json({ message: 'Failed to cancel registration' });
  }
};

// @GET /api/registrations/my
export const getMyRegistrations = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { user: req.user._id };
    if (status) query.status = status;

    const registrations = await Registration.find(query)
      .populate('event')
      .populate('user', 'name email')
      .sort('-createdAt');

    res.json({ registrations });
  } catch (error) {
    logger.error('Error fetching registrations:', error);
    res.status(500).json({ message: 'Failed to fetch registrations' });
  }
};

// @GET /api/registrations/check/:eventId
export const checkRegistration = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      user: req.user._id,
      event: req.params.eventId,
      status: { $in: ['confirmed', 'waitlisted', 'attended'] },
    }).populate('event', 'title startDate');

    res.json({ isRegistered: !!registration, registration });
  } catch (error) {
    logger.error('Error checking registration:', error);
    res.status(500).json({ message: 'Failed to check registration' });
  }
};

// @POST /api/registrations/:id/feedback
export const submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const registration = await Registration.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'attended',
    });

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found or event not attended' });
    }

    registration.feedback = { rating, comment, submittedAt: new Date() };
    await registration.save();

    res.json({ message: 'Feedback submitted', registration });
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
};

// @POST /api/registrations/:id/checkin  (Admin only)
export const checkInAttendee = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('event', 'title');

    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (registration.status !== 'confirmed') {
      return res.status(400).json({ message: 'Cannot check in: registration is not confirmed' });
    }

    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    registration.status = 'attended';
    await registration.save();

    res.json({ message: `${registration.user.name} checked in successfully`, registration });
  } catch (error) {
    logger.error('Error checking in attendee:', error);
    res.status(500).json({ message: 'Failed to check in attendee' });
  }
};

// @POST /api/registrations/:id/regenerate-qr  (Admin only)
export const regenerateQRCode = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('event', 'title startDate startTime endTime venue');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    if (registration.status !== 'confirmed') {
      return res.status(400).json({ message: 'Can only regenerate QR for confirmed registrations' });
    }

    const qrData = {
      ticketType: 'event',
      attendeeName: registration.user.name,
      userId: registration.user._id,
      eventId: registration.event._id,
      eventTitle: registration.event.title,
      registrationId: registration._id,
      regeneratedAt: new Date().toISOString(),
      reason: 'admin_regenerated',
    };

    const newQrCode = await generateQRCode(qrData);
    registration.qrCode = newQrCode;
    await registration.save();

    await sendRegistrationConfirmation({
      to: registration.user.email,
      userName: registration.user.name,
      event: registration.event,
      ticketNumber: registration.ticketNumber,
      qrCode: newQrCode,
      userPhone: registration.user.phone,
    }).catch(err => logger.error('Failed to send QR regeneration email:', err));

    res.json({ message: 'QR code regenerated and new email sent', qrCode: newQrCode });
  } catch (error) {
    logger.error('QR Regeneration error:', error);
    res.status(500).json({ message: 'Failed to regenerate QR code' });
  }
};

// @GET /api/registrations/:id/ticket-pdf
export const downloadTicketPDF = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('user', 'name email')
      .populate('event', 'title startDate startTime endTime venue');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const isOwner = registration.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (registration.status !== 'confirmed' && registration.status !== 'attended') {
      return res.status(400).json({ message: 'Ticket only available for confirmed registrations' });
    }

    const qrCodeBuffer = registration.qrCode
      ? Buffer.from(registration.qrCode.split(',')[1] || '', 'base64')
      : null;

    const pdfBuffer = await generateTicketPDF({
      event: registration.event,
      registration,
      user: registration.user,
      qrCodeBuffer,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${registration.ticketNumber || registration._id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF generation error:', error);
    res.status(500).json({ message: 'Failed to generate ticket PDF' });
  }
};

// @GET /api/registrations/public/:id (no auth required)
export const getPublicTicket = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('user', 'name email')
      .populate('event', 'title startDate startTime endTime venue category price');

    if (!registration) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (registration.status !== 'confirmed' && registration.status !== 'attended') {
      return res.status(400).json({ message: 'Ticket is not valid' });
    }

    res.json({ registration });
  } catch (error) {
    logger.error('Error fetching public ticket:', error);
    res.status(500).json({ message: 'Failed to fetch ticket details' });
  }
};