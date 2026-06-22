import stripe from '../config/stripe.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import { generateQRCode } from '../utils/qrCode.js';
import { sendRegistrationConfirmation } from '../utils/email.js';
import logger from '../utils/logger.js';
import { createNotification } from './notificationController.js';

// @POST /api/payments/create-checkout-session/:eventId
export const createCheckoutSession = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;
    const { ticketTypeName } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      logger.warn(`Payment session creation failed: Event ${eventId} not found`);
      return res.status(404).json({ message: 'Event not found' });
    }

    // Determine price based on ticket type
    let price = event.price;
    let isFree = event.isFree;
    let selectedTicketType = null;

    if (event.ticketTypes && event.ticketTypes.length > 0) {
      if (!ticketTypeName) {
        return res.status(400).json({ message: 'Please select a ticket type' });
      }
      selectedTicketType = event.ticketTypes.find(t => t.name === ticketTypeName && t.isActive);
      if (!selectedTicketType) {
        return res.status(400).json({ message: 'Invalid ticket type' });
      }
      price = selectedTicketType.price;
      isFree = selectedTicketType.isFree;
    }

    if (isFree || price === 0) {
      logger.warn(`Payment session creation failed: Event ${eventId} is free`);
      return res.status(400).json({ message: 'This event is free. Please register normally.' });
    }

    // Check for existing confirmed registration
    const existingConfirmed = await Registration.findOne({
      user: userId,
      event: eventId,
      status: 'confirmed',
    });

    if (existingConfirmed) {
      logger.warn(`User ${userId} already registered for event ${eventId}`);
      return res.status(409).json({
        message: 'You are already registered for this event',
        status: existingConfirmed.status
      });
    }

    // Clean up any stale pending_payment or cancelled registrations
    await Registration.deleteMany({
      user: userId,
      event: eventId,
      status: { $in: ['pending_payment', 'cancelled'] },
    });

    // Atomically check capacity before creating payment session
    let capacityAvailable;
    if (selectedTicketType) {
      capacityAvailable = await Event.findOne({
        _id: eventId,
        'ticketTypes.name': selectedTicketType.name,
        $expr: { $lt: [{ $arrayElemAt: ['$ticketTypes.registeredCount', { $indexOfArray: ['$ticketTypes.name', selectedTicketType.name] }] }, { $arrayElemAt: ['$ticketTypes.capacity', { $indexOfArray: ['$ticketTypes.name', selectedTicketType.name] }] }] },
      });
    } else {
      capacityAvailable = await Event.findOne({
        _id: eventId,
        $expr: { $lt: ['$registeredCount', '$capacity'] },
      });
    }

    if (!capacityAvailable) {
      logger.warn(`Payment session creation failed: Event ${eventId} is full`);
      return res.status(400).json({ message: 'Event is full. No spots available.' });
    }

    const user = await User.findById(userId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Handle coupon code
    const { couponCode } = req.body;
    let finalPrice = price;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
      if (coupon && coupon.isActive && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date()) &&
          (coupon.maxUses === 0 || coupon.currentUses < coupon.maxUses) &&
          (!coupon.event || coupon.event.toString() === eventId)) {
        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = (price * coupon.discountValue) / 100;
          if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
        } else {
          discount = Math.min(coupon.discountValue, price);
        }
        finalPrice = price - discount;
        appliedCoupon = coupon._id.toString();
      }
    }
    if (finalPrice < 0) finalPrice = 0;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&event_id=${eventId}`,
      cancel_url: `${frontendUrl}/events/${eventId}?payment_cancelled=true`,
      customer_email: user.email,
      metadata: {
        eventId: eventId.toString(),
        userId: userId.toString(),
        eventTitle: event.title,
        ...(selectedTicketType && { ticketTypeName: selectedTicketType.name }),
        ...(appliedCoupon && { couponId: appliedCoupon }),
      },
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: event.title,
              description: `Event ticket for ${event.title}${appliedCoupon ? ' (with discount)' : ''}`,
            },
            unit_amount: Math.round(Math.max(finalPrice, 0) * 100),
          },
          quantity: 1,
        },
      ],
    });

    // Create a pending_payment registration so verifyPayment can find it by paymentId
    await Registration.create({
      user: userId,
      event: eventId,
      status: 'pending_payment',
      paymentStatus: 'pending',
      paymentId: session.id,
      ticketTypeName: selectedTicketType?.name,
    });

    logger.info(`Stripe checkout session created for user ${userId}, event ${event.title}, session ${session.id}`);
    res.json({ sessionId: session.id, sessionUrl: session.url });

  } catch (error) {
    logger.error('Stripe checkout error:', error);
    res.status(500).json({ message: 'Failed to create payment session', error: error.message });
  }
};

// @GET /api/payments/verify/:sessionId
export const verifyPayment = async (req, res) => {
  if (!req.user) {
    logger.warn('Payment verification attempted without authentication');
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  
  try {
    const { sessionId } = req.params;
    const eventId = req.query.event_id;

    logger.info(`🔍 Verifying payment: sessionId=${sessionId}, eventId=${eventId}, userId=${req.user._id}`);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logger.info(`📊 Session status: ${session.payment_status}`);

    // Try to find registration by paymentId, then by user+event
    let registration = await Registration.findOne({ paymentId: sessionId });

    if (!registration) {
      logger.debug('Not found by paymentId, checking by user/event...');
      registration = await Registration.findOne({
        user: req.user._id,
        event: eventId
      });
    }

    if (session.payment_status === 'paid') {
      // If we found a registration, update it
      if (registration) {
        logger.info(`✅ Found registration ${registration._id}, updating to confirmed...`);

        // If it was pending, update it
        if (registration.status === 'pending_payment' || registration.status === 'cancelled') {
          const prevStatus = registration.status;
          registration.status = 'confirmed';
          registration.paymentStatus = 'paid';
          registration.paymentId = sessionId;
          await registration.save();
          logger.info(`Registration ${registration._id} updated from ${prevStatus} to confirmed`);
          // Capacity was already reserved atomically during registration, so no increment needed
        }
      } else {
        // No registration found - create a new one (edge case)
        logger.warn(`⚠️ No registration found, creating new one for user ${req.user._id}, event ${eventId}`);

        const event = await Event.findById(eventId);
        if (!event) {
          logger.error(`Event ${eventId} not found during payment verification`);
          return res.json({
            success: false,
            message: 'Event not found',
          });
        }

        // Atomically reserve a seat
        let updatedEvent;
        if (session.metadata?.ticketTypeName) {
          updatedEvent = await Event.findOneAndUpdate(
            {
              _id: eventId,
              'ticketTypes.name': session.metadata.ticketTypeName,
              $expr: { $lt: [{ $arrayElemAt: ['$ticketTypes.registeredCount', { $indexOfArray: ['$ticketTypes.name', session.metadata.ticketTypeName] }] }, { $arrayElemAt: ['$ticketTypes.capacity', { $indexOfArray: ['$ticketTypes.name', session.metadata.ticketTypeName] }] }] },
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

        if (!updatedEvent) {
          logger.error(`Cannot create registration — event ${eventId} is full`);
          return res.json({
            success: false,
            message: 'Event is full. Cannot complete registration.',
          });
        }

        registration = await Registration.create({
          user: req.user._id,
          event: eventId,
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentId: sessionId,
          ticketTypeName: session.metadata?.ticketTypeName || undefined,
        });

        logger.info(`New registration created for user ${req.user._id}, event ${event.title}`);
      }

      // Generate QR code if not exists
      if (!registration.qrCode) {
        logger.debug(`Generating QR code for registration ${registration._id}`);
        const event = await Event.findById(eventId);
        const user = await User.findById(req.user._id);
        
        const qrData = {
          ticketType: 'event',
          attendeeName: user.name,
          userId: registration.user,
          eventId: eventId,
          eventTitle: event?.title || 'Event',
          registrationId: registration._id,
          paymentConfirmed: true,
        };
        const qrCode = await generateQRCode(qrData);
        registration.qrCode = qrCode;
        await registration.save();
        logger.info(`QR code generated for registration ${registration._id}`);
      }

      // Populate user and event data
      await registration.populate([
        { path: 'user', select: 'name email' },
        { path: 'event', select: 'title startDate startTime endTime venue category price' },
      ]);

      // Increment coupon usage if applied
      if (session.metadata?.couponId) {
        await Coupon.findByIdAndUpdate(session.metadata.couponId, { $inc: { currentUses: 1 } });
      }

      createNotification({
        user: req.user._id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `Your payment for "${registration.event.title}" was successful!`,
        event: eventId,
        link: `/events/${eventId}`,
      });

      // Send confirmation email
      try {
        await sendRegistrationConfirmation({
          to: registration.user.email,
          userName: registration.user.name,
          event: registration.event,
          ticketNumber: registration.ticketNumber,
          qrCode: registration.qrCode,
        });
        logger.info(`Confirmation email sent to ${registration.user.email} for event ${registration.event.title}`);
      } catch (emailErr) {
        logger.error('Email sending failed:', emailErr);
      }

      logger.info(`✅ Payment verification successful for user ${req.user._id}, event ${eventId}`);
      return res.json({
        success: true,
        message: 'Payment successful! You are registered.',
        registration,
      });
    } else {
      // Payment not completed
      logger.warn(`❌ Payment not completed for session ${sessionId}, status: ${session.payment_status}`);

      // Clean up pending registration if exists
      if (registration && registration.status === 'pending_payment') {
        await Registration.findByIdAndDelete(registration._id);
        logger.info(`Deleted pending registration ${registration._id} due to failed payment`);
      }

      return res.json({
        success: false,
        message: 'Payment not completed. Please try again.',
      });
    }
  } catch (error) {
    logger.error('Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment: ' + error.message });
  }
};

// @POST /api/payments/webhook
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  // Check if webhook secret is configured
  if (!endpointSecret) {
    logger.error('❌ STRIPE_WEBHOOK_SECRET is not configured in environment variables');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      logger.info(`💰 Payment completed for session: ${session.id}`);
      
      try {
        // Update registration status
        const registration = await Registration.findOne({ paymentId: session.id });
        if (registration && registration.status === 'pending_payment') {
          registration.status = 'confirmed';
          registration.paymentStatus = 'paid';
          await registration.save();
          logger.info(`✅ Registration ${registration._id} confirmed via webhook`);
          // Capacity was already reserved atomically during registration, so no increment needed
          
          // Generate QR code
          const user = await User.findById(registration.user);
          const eventDoc = await Event.findById(registration.event);
          if (user) {
            const qrData = {
              ticketType: 'event',
              attendeeName: user.name,
              userId: registration.user,
              eventId: registration.event,
              eventTitle: eventDoc?.title || 'Event',
              registrationId: registration._id,
            };
            const qrCode = await generateQRCode(qrData);
            registration.qrCode = qrCode;
            await registration.save();
            
            if (session.metadata?.couponId) {
              await Coupon.findByIdAndUpdate(session.metadata.couponId, { $inc: { currentUses: 1 } });
            }

            createNotification({
              user: registration.user,
              type: 'payment_received',
              title: 'Payment Received',
              message: `Your payment for "${eventDoc?.title || 'Event'}" was successful!`,
              event: registration.event,
              link: `/events/${registration.event}`,
            });

            if (eventDoc) {
              await sendRegistrationConfirmation({
                to: user.email,
                userName: user.name,
                event: eventDoc,
                ticketNumber: registration.ticketNumber,
                qrCode: qrCode,
              });
              logger.info(`Confirmation email sent to ${user.email}`);
            }
          }
        } else if (registration) {
          logger.warn(`⚠️ Registration ${registration?._id} already has status: ${registration?.status}`);
        } else {
          logger.warn(`⚠️ No registration found for session ${session.id}, creating new...`);
          const { eventId, userId } = session.metadata || {};
          if (eventId && userId) {
            const event = await Event.findById(eventId);
            const user = await User.findById(userId);
            if (event && user) {
              // Atomically reserve a seat
              let updatedEvent;
              if (session.metadata?.ticketTypeName) {
                updatedEvent = await Event.findOneAndUpdate(
                  {
                    _id: eventId,
                    'ticketTypes.name': session.metadata.ticketTypeName,
                    $expr: { $lt: [{ $arrayElemAt: ['$ticketTypes.registeredCount', { $indexOfArray: ['$ticketTypes.name', session.metadata.ticketTypeName] }] }, { $arrayElemAt: ['$ticketTypes.capacity', { $indexOfArray: ['$ticketTypes.name', session.metadata.ticketTypeName] }] }] },
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

              if (!updatedEvent) {
                logger.error(`Webhook: Event ${eventId} is full, cannot create registration`);
                break;
              }

              const newRegistration = await Registration.create({
                user: userId,
                event: eventId,
                status: 'confirmed',
                paymentStatus: 'paid',
                paymentId: session.id,
                ticketTypeName: session.metadata?.ticketTypeName || undefined,
              });
              logger.info(`✅ New registration ${newRegistration._id} created via webhook for session ${session.id}`);
            }
          }
        }
      } catch (error) {
        logger.error(`❌ Error processing webhook event: ${error.message}`);
      }
      break;
      
    default:
      logger.debug(`📝 Unhandled event type: ${event.type}`);
  }
  
  res.json({ received: true });
};