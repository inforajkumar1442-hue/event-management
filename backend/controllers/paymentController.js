import stripe from '../config/stripe.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';
import { generateQRCode } from '../utils/qrCode.js';
import { sendRegistrationConfirmation } from '../utils/email.js';
import logger from '../utils/logger.js';

// @POST /api/payments/create-checkout-session/:eventId
export const createCheckoutSession = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      logger.warn(`Payment session creation failed: Event ${eventId} not found`);
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.isFree || event.price === 0) {
      logger.warn(`Payment session creation failed: Event ${eventId} is free`);
      return res.status(400).json({ message: 'This event is free. Please register normally.' });
    }

    // Check for existing confirmed registration
    let existingRegistration = await Registration.findOne({
      user: userId,
      event: eventId,
    });

    if (existingRegistration && existingRegistration.status === 'confirmed') {
      logger.warn(`User ${userId} already registered for event ${eventId}`);
      return res.status(409).json({
        message: 'You are already registered for this event',
        status: existingRegistration.status
      });
    }

    // If there's an existing pending payment, reuse it
    if (existingRegistration && existingRegistration.status === 'pending_payment') {
      logger.info(`Found existing pending registration for user ${userId}, event ${eventId}, reusing...`);

      const user = await User.findById(userId);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&event_id=${eventId}&reg_id=${existingRegistration._id}`,
        cancel_url: `${frontendUrl}/events/${eventId}?payment_cancelled=true`,
        customer_email: user.email,
        metadata: {
          eventId: eventId.toString(),
          userId: userId.toString(),
          registrationId: existingRegistration._id.toString(),
          eventTitle: event.title,
        },
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: event.title,
                description: `Event ticket for ${event.title}`,
              },
              unit_amount: Math.round(event.price * 100),
            },
            quantity: 1,
          },
        ],
      });

      existingRegistration.paymentId = session.id;
      await existingRegistration.save();

      logger.info(`Stripe checkout session created for user ${userId}, event ${event.title}, session ${session.id}`);
      return res.json({ sessionId: session.id, sessionUrl: session.url });
    }

    // No existing registration - create new one
    const user = await User.findById(userId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const registration = await Registration.create({
      user: userId,
      event: eventId,
      status: 'pending_payment',
      paymentStatus: 'pending',
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&event_id=${eventId}&reg_id=${registration._id}`,
      cancel_url: `${frontendUrl}/events/${eventId}?payment_cancelled=true`,
      customer_email: user.email,
      metadata: {
        eventId: eventId.toString(),
        userId: userId.toString(),
        registrationId: registration._id.toString(),
        eventTitle: event.title,
      },
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: event.title,
              description: `Event ticket for ${event.title}`,
            },
            unit_amount: Math.round(event.price * 100),
          },
          quantity: 1,
        },
      ],
    });

    registration.paymentId = session.id;
    await registration.save();

    logger.info(`New Stripe checkout session created for user ${userId}, event ${event.title}, session ${session.id}`);
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
    const { eventId, regId } = req.query;

    logger.info(`🔍 Verifying payment: sessionId=${sessionId}, eventId=${eventId}, regId=${regId}, userId=${req.user._id}`);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logger.info(`📊 Session status: ${session.payment_status}`);

    // Try to find registration by ID first
    let registration = await Registration.findById(regId);

    // If not found by ID, try to find by paymentId
    if (!registration) {
      logger.debug('Registration not found by ID, searching by paymentId...');
      registration = await Registration.findOne({ paymentId: sessionId });
    }

    // If still not found, check if there's a registration for this user/event
    if (!registration) {
      logger.debug('Still not found, checking by user/event...');
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
          registration.status = 'confirmed';
          registration.paymentStatus = 'paid';
          registration.paymentId = sessionId;
          await registration.save();
          logger.info(`Registration ${registration._id} updated from ${registration.status} to confirmed`);
          
          // Increment event registered count
          const event = await Event.findById(eventId);
          if (event) {
            event.registeredCount += 1;
            await event.save();
            logger.info(`Event ${event.title} registered count updated to ${event.registeredCount}`);
          }
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

        registration = await Registration.create({
          user: req.user._id,
          event: eventId,
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentId: sessionId,
        });

        // Update event count
        event.registeredCount += 1;
        await event.save();
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
          
          // Update event count
          const event = await Event.findById(registration.event);
          if (event) {
            event.registeredCount += 1;
            await event.save();
            logger.info(`📊 Event ${event.title} registered count: ${event.registeredCount}`);
          }
          
          // Generate QR code
          const user = await User.findById(registration.user);
          if (user) {
            const qrData = {
              ticketType: 'event',
              attendeeName: user.name,
              userId: registration.user,
              eventId: registration.event,
              eventTitle: event?.title || 'Event',
              registrationId: registration._id,
            };
            const qrCode = await generateQRCode(qrData);
            registration.qrCode = qrCode;
            await registration.save();
            
            // Send confirmation email
            if (event) {
              await sendRegistrationConfirmation({
                to: user.email,
                userName: user.name,
                event: event,
                ticketNumber: registration.ticketNumber,
                qrCode: qrCode,
              });
              logger.info(`📧 Confirmation email sent to ${user.email}`);
            }
          }
        } else if (registration) {
          logger.warn(`⚠️ Registration ${registration?._id} already has status: ${registration?.status}`);
        } else {
          logger.warn(`⚠️ No registration found for session: ${session.id}`);
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