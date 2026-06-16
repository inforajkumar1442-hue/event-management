import twilio from 'twilio';
import logger from './logger.js';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;

if (accountSid && authToken && twilioPhoneNumber) {
  client = twilio(accountSid, authToken);
  logger.info('✅ Twilio SMS service initialized');
} else {
  logger.warn('⚠️ Twilio credentials missing. SMS notifications disabled.');
}

/**
 * Send SMS notification to user
 */
export const sendSMS = async (to, message) => {
  if (!client) {
    logger.warn('SMS not sent - Twilio not configured');
    return false;
  }

  try {
    // Format phone number (ensure it has country code)
    let formattedNumber = to;
    if (!to.startsWith('+')) {
      formattedNumber = `+91${to}`; // Default to India +91
    }

    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedNumber
    });

    logger.info(`✅ SMS sent to ${to}: ${result.sid}`);
    return true;
  } catch (error) {
    logger.error('❌ SMS sending failed:', error.message);
    return false;
  }
};

/**
 * Send registration confirmation SMS
 */
export const sendRegistrationSMS = async ({ phone, userName, event, ticketNumber }) => {
  const firstName = userName.split(' ')[0];
  
  const message = `🎉 ${firstName}, you're registered for "${event.title}"! 📅 ${new Date(event.startDate).toLocaleDateString()} at ${event.startTime} 📍 ${event.venue} 🎫 Ticket: ${ticketNumber}. Show this SMS at entrance. - EventGather`;

  return await sendSMS(phone, message);
};

/**
 * Send event reminder SMS
 */
export const sendReminderSMS = async ({ phone, userName, event, reminderType }) => {
  const firstName = userName.split(' ')[0];
  
  let message = '';
  
  switch(reminderType) {
    case 'tomorrow':
      message = `⏰ Reminder ${firstName}! "${event.title}" is TOMORROW at ${event.startTime}. Venue: ${event.venue}. Don't forget your ticket! - EventGather`;
      break;
    case 'today':
      message = `🔔 ${firstName}, "${event.title}" starts TODAY at ${event.startTime}! Venue: ${event.venue}. See you there! - EventGather`;
      break;
    case 'five_days':
      message = `📅 ${firstName}, only 5 DAYS left for "${event.title}" on ${new Date(event.startDate).toLocaleDateString()}. Get ready! - EventGather`;
      break;
    case 'one_week':
      message = `📅 ${firstName}, 1 WEEK to go for "${event.title}" on ${new Date(event.startDate).toLocaleDateString()}. We can't wait to see you! - EventGather`;
      break;
    default:
      message = `📢 ${firstName}, reminder: "${event.title}" on ${new Date(event.startDate).toLocaleDateString()} at ${event.startTime}. Venue: ${event.venue}. - EventGather`;
  }
  
  return await sendSMS(phone, message);
};

/**
 * Send cancellation SMS
 */
export const sendCancellationSMS = async ({ phone, userName, event }) => {
  const firstName = userName.split(' ')[0];
  
  const message = `❌ ${firstName}, your registration for "${event.title}" has been cancelled. If this was a mistake, please re-register on our website. - EventGather`;
  
  return await sendSMS(phone, message);
};