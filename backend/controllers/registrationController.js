import mongoose from 'mongoose';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { generateQRCode } from '../utils/qrCode.js';
import { sendRegistrationConfirmation, sendCancellationEmail } from '../utils/email.js';
import { sendRegistrationSMS, sendCancellationSMS } from '../utils/sms.js';  // ✅ Added sendCancellationSMS

// Helper function to extract first name (for personalization)
const getFirstName = (fullName) => {
  if (!fullName) return 'Attendee';
  return fullName.split(' ')[0];
};

// @POST /api/registrations/:eventId
export const registerForEvent = async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user._id;

  let session;
  try {
    // Start a MongoDB session for transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Get event with lock
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event is cancelled or completed
    if (event.status === 'cancelled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'This event has been cancelled' });
    }

    if (event.status === 'completed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'This event has already ended' });
    }

    // Check if user already registered
    const existingRegistration = await Registration.findOne({
      user: userId,
      event: eventId,
      status: { $in: ['confirmed', 'waitlisted', 'attended'] },
    }).session(session);

    if (existingRegistration) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: existingRegistration.status === 'waitlisted'
          ? 'You are already on the waitlist for this event'
          : 'You are already registered for this event'
      });
    }

    // Check for pending payment registration and clean it up
    const pendingPayment = await Registration.findOne({
      user: userId,
      event: eventId,
      status: 'pending_payment',
    }).session(session);

    if (pendingPayment) {
      await pendingPayment.deleteOne({ session });
    }

    // Get user for QR code
    const user = await User.findById(userId).session(session);

    let registration;
    let status = 'confirmed';
    let message = 'Registration successful!';

    // Check if event requires payment
    if (!event.isFree && event.price > 0) {
      status = 'pending_payment';
      message = 'Payment required to complete registration';
    }
    // For free events, check capacity
    else if (event.registeredCount >= event.capacity) {
      status = 'waitlisted';
      message = 'Event is full. You have been added to the waitlist.';
    } else {
      // Increment registered count for confirmed free registration
      await Event.updateOne(
        { _id: eventId },
        { $inc: { registeredCount: 1 } },
        { session }
      );
    }

    // Create registration
    const createdRegistrations = await Registration.create([{
      user: userId,
      event: eventId,
      status,
      paymentStatus: (event.isFree || event.price === 0) ? 'free' : 'pending',
    }], { session });

    registration = createdRegistrations[0];

    // Generate QR code with registration data
    const qrData = {
      ticketType: 'event',
      attendeeName: user.name,
      userId: userId,
      eventId: eventId,
      eventTitle: event.title,
      registrationId: registration._id,
    };

    const qrCode = await generateQRCode(qrData);
    registration.qrCode = qrCode;
    await registration.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Populate for response
    await registration.populate([
      { path: 'user', select: 'name email department phone' },
      { path: 'event', select: 'title startDate startTime endTime venue price isFree capacity registeredCount' },
    ]);

    // Send confirmation email and SMS only for confirmed registrations (not pending payment)
    if (status === 'confirmed') {
      try {
        // Send Email
        await sendRegistrationConfirmation({
          to: user.email,
          userName: user.name,
          event: registration.event,
          ticketNumber: registration.ticketNumber,
          qrCode: qrCode,
          userPhone: user.phone
        });
        console.log(`📧 Confirmation email sent to ${user.email}`);
        
        // Send SMS if user has phone number
        if (user.phone && user.phone.trim()) {
          await sendRegistrationSMS({
            phone: user.phone,
            userName: user.name,
            event: registration.event,
            ticketNumber: registration.ticketNumber
          });
          console.log(`📱 Confirmation SMS sent to ${user.phone}`);
        } else {
          console.log(`⚠️ No phone number for user ${user.email}, SMS not sent`);
        }
        
      } catch (notifErr) {
        console.error('Failed to send notifications:', notifErr);
        // Don't fail the registration if notifications fail
      }
    }

    res.status(201).json({
      message,
      registration,
      requiresPayment: status === 'pending_payment',
    });

  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// @DELETE /api/registrations/:eventId
export const cancelRegistration = async (req, res) => {
  const { eventId } = req.params;

  // Start transaction for cancellation
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const registration = await Registration.findOne({
      user: req.user._id,
      event: eventId,
      status: { $in: ['confirmed', 'waitlisted'] },
    }).session(session);

    if (!registration) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Registration not found' });
    }

    if (registration.status === 'confirmed') {
      const event = await Event.findById(eventId).session(session);
      if (event) {
        // Atomically decrement count
        await Event.updateOne(
          { _id: eventId },
          { $inc: { registeredCount: -1 } },
          { session }
        );

        // Find and promote first waitlisted user (within transaction)
        const waitlisted = await Registration.findOne({
          event: eventId,
          status: 'waitlisted'
        })
          .sort('createdAt')
          .session(session);

        if (waitlisted) {
          // Get user for QR
          const waitlistedUser = await User.findById(waitlisted.user).session(session);

          const newQrData = {
            ticketType: 'event',
            attendeeName: waitlistedUser.name,
            userId: waitlisted.user,
            eventId,
            eventTitle: event.title,
            registrationId: waitlisted._id,
            promotedAt: new Date().toISOString(),
          };
          const newQrCode = await generateQRCode(newQrData);

          waitlisted.status = 'confirmed';
          waitlisted.qrCode = newQrCode;
          await waitlisted.save({ session });

          // Increment count for promoted user
          await Event.updateOne(
            { _id: eventId },
            { $inc: { registeredCount: 1 } },
            { session }
          );

          // Populate for email
          await waitlisted.populate([
            { path: 'user', select: 'name email phone' },
            { path: 'event', select: 'title startDate startTime endTime venue' },
          ]);

          // Store notification data for after transaction
          const promotedEmailData = {
            to: waitlisted.user.email,
            userName: waitlisted.user.name,
            event: waitlisted.event,
            ticketNumber: waitlisted.ticketNumber,
            qrCode: newQrCode,
          };

          // Commit before sending notifications
          await session.commitTransaction();
          session.endSession();

          // Send notifications to promoted user
          await sendRegistrationConfirmation(promotedEmailData).catch(console.error);
          
          // Send SMS to promoted user if they have phone number
          if (waitlisted.user.phone && waitlisted.user.phone.trim()) {
            await sendRegistrationSMS({
              phone: waitlisted.user.phone,
              userName: waitlisted.user.name,
              event: waitlisted.event,
              ticketNumber: waitlisted.ticketNumber
            }).catch(console.error);
          }

          // Cancel the original registration
          registration.status = 'cancelled';
          await registration.save();

          return res.json({ message: 'Registration cancelled and waitlisted user promoted' });
        }
      }
    }

    // If no waitlist promotion, just cancel the registration
    registration.status = 'cancelled';
    await registration.save({ session });

    await registration.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'event', select: 'title' },
    ]);

    await session.commitTransaction();
    session.endSession();

    // Send cancellation email
    await sendCancellationEmail({
      to: registration.user.email,
      userName: registration.user.name,
      event: registration.event,
    }).catch(console.error);

    // Send cancellation SMS if user has phone number
    if (registration.user.phone && registration.user.phone.trim()) {
      await sendCancellationSMS({
        phone: registration.user.phone,
        userName: registration.user.name,
        event: registration.event,
      }).catch(console.error);
    }

    res.json({ message: 'Registration cancelled' });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Cancellation error:', error);
    res.status(500).json({ message: 'Failed to cancel registration' });
  }
};

// @GET /api/registrations/my
export const getMyRegistrations = async (req, res) => {
  const { status } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;

  const registrations = await Registration.find(query)
    .populate('event')
    .populate('user', 'name email')
    .sort('-createdAt');

  res.json({ registrations });
};

// @GET /api/registrations/check/:eventId
export const checkRegistration = async (req, res) => {
  const registration = await Registration.findOne({
    user: req.user._id,
    event: req.params.eventId,
    status: { $in: ['confirmed', 'waitlisted', 'attended'] },
  }).populate('event', 'title startDate');

  res.json({ isRegistered: !!registration, registration });
};

// @POST /api/registrations/:id/feedback
export const submitFeedback = async (req, res) => {
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
};

// @POST /api/registrations/:id/checkin  (Admin only)
export const checkInAttendee = async (req, res) => {
  const registration = await Registration.findById(req.params.id)
    .populate('user', 'name email phone')  // ✅ Added phone for SMS
    .populate('event', 'title');

  if (!registration) return res.status(404).json({ message: 'Registration not found' });
  if (registration.status !== 'confirmed') {
    return res.status(400).json({ message: 'Cannot check in: registration is not confirmed' });
  }

  registration.checkedIn = true;
  registration.checkedInAt = new Date();
  registration.status = 'attended';
  await registration.save();

  // ✅ Optional: Send check-in confirmation SMS
  if (registration.user.phone) {
    // You can create a sendCheckInSMS function if needed
    console.log(`📱 Check-in SMS would be sent to ${registration.user.phone}`);
  }

  res.json({ message: `${registration.user.name} checked in successfully`, registration });
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
    }).catch(console.error);

    res.json({ message: 'QR code regenerated and new email sent', qrCode: newQrCode });
  } catch (error) {
    console.error('QR Regeneration error:', error);
    res.status(500).json({ message: 'Failed to regenerate QR code' });
  }
};