import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
import logger from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) {
    logger.error('Email transporter verification failed: ' + err.message);
  } else {
    logger.info('Email transporter is ready');
  }
});

const emailStyles = `
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .body { padding: 40px; color: #333; }
    .body h2 { color: #6366f1; }
    .badge { display: inline-block; background: #f0f0ff; color: #6366f1; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .info-card { background: #f8f8ff; border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .info-row { margin: 8px 0; font-size: 15px; }
    .info-row strong { color: #555; }
    .ticket { text-align: center; background: #fafafa; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .ticket-number { font-size: 22px; font-weight: 700; color: #6366f1; letter-spacing: 2px; }
    .footer { background: #f8f8f8; padding: 24px; text-align: center; font-size: 13px; color: #888; }
  </style>
`;

export const sendRegistrationConfirmation = async ({ to, userName, event, ticketNumber, qrCode, userPhone }) => {
  const firstName = userName.split(' ')[0];
  
  // Format date properly
  const eventDate = event.startDate ? new Date(event.startDate) : null;
  const formattedDate = eventDate ? eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  }) : 'Date TBA';
  
  // Format time
  const eventTime = event.startTime ? 
    (event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime) : 
    'Time TBA';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Registration Confirmed - EventGather</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          padding: 40px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 10px 0 0;
          opacity: 0.95;
        }
        .body {
          padding: 40px;
          color: #333;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
        }
        .info-card {
          background: #f8f8ff;
          border-left: 4px solid #6366f1;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .attendee-box {
          background: #f0f0ff;
          padding: 16px;
          border-radius: 12px;
          margin: 20px 0;
        }
        .attendee-box .row {
          margin: 8px 0;
          font-size: 15px;
        }
        .badge {
          display: inline-block;
          background: #f0f0ff;
          color: #6366f1;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }
        .ticket {
          text-align: center;
          background: #fafafa;
          border: 2px dashed #6366f1;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
        }
        .ticket-number {
          font-size: 24px;
          font-weight: 700;
          color: #6366f1;
          letter-spacing: 2px;
          font-family: monospace;
        }
        .qr-code {
          margin-top: 16px;
          text-align: center;
        }
        .qr-code img {
          width: 150px;
          height: 150px;
          border-radius: 8px;
        }
        .sms-notice {
          background: #e8f5e9;
          padding: 12px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          font-size: 14px;
        }
        .footer {
          background: #f8f8f8;
          padding: 24px;
          text-align: center;
          font-size: 13px;
          color: #888;
        }
        .button {
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Registration Confirmed, ${firstName}!</h1>
          <p>You're all set for ${event.title}</p>
        </div>
        
        <div class="body">
          <div class="greeting">
            Hi <strong>${userName}</strong>,
          </div>
          
          <p>Your registration has been confirmed. Here are your event details:</p>
          
          <!-- Attendee Information Box with Phone Number -->
          <div class="attendee-box">
            <div class="row">👤 <strong>Attendee:</strong> ${userName}</div>
            <div class="row">📧 <strong>Email:</strong> ${to}</div>
            <div class="row">📱 <strong>Phone:</strong> ${userPhone || 'Not provided'}</div>
          </div>
          
          <!-- Event Details -->
          <div class="info-card">
            <div class="row">📅 <strong>Event:</strong> ${event.title}</div>
            <div class="row">📆 <strong>Date:</strong> ${formattedDate}</div>
            <div class="row">⏰ <strong>Time:</strong> ${eventTime}</div>
            <div class="row">📍 <strong>Venue:</strong> ${event.venue}</div>
            <div class="row">🏷️ <strong>Category:</strong> <span class="badge">${event.category || 'General'}</span></div>
          </div>
          
          <!-- Ticket Section -->
          <div class="ticket">
            <p style="color:#888; margin:0 0 8px;">Your Ticket Number</p>
            <div class="ticket-number">${ticketNumber}</div>
            
            ${qrCode ? `
              <div class="qr-code">
                <img src="${qrCode}" alt="QR Code" />
                <p style="color:#aaa; font-size:12px; margin:8px 0 0;">Show this QR code at the event entrance</p>
                <p style="color:#6366f1; font-size:12px; margin:4px 0 0;">Ticket for: ${firstName}</p>
              </div>
            ` : ''}
          </div>
          
          <!-- SMS Notice -->
          ${userPhone ? `
            <div class="sms-notice">
              📱 <strong>SMS Sent!</strong> We've also sent an SMS confirmation to <strong>${userPhone}</strong> with your ticket details.
            </div>
          ` : `
            <div class="sms-notice" style="background: #fff3e0;">
              📱 <strong>No Phone Number Provided</strong> To receive SMS updates, please add your phone number in your profile settings.
            </div>
          `}
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">
            View My Events
          </a>
          
          <p style="color:#888; font-size:14px; margin-top: 30px;">
            Need help? Contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#6366f1;">${process.env.EMAIL_USER}</a>
          </p>
        </div>
        
        <div class="footer">
          <p>EventGather — Connecting people through experiences</p>
          <p style="font-size: 11px;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return transporter.sendMail({
    from: `"EventGather" <${process.env.EMAIL_USER}>`,
    to,
    subject: `✅ ${firstName}, your registration for ${event.title} is confirmed!`,
    html,
  });
};

export const sendEventReminder = async ({ to, userName, event }) => {
  const html = `
    ${emailStyles}
    <div class="container">
      <div class="header">
        <h1>⏰ Event Reminder</h1>
        <p>Your event is tomorrow!</p>
      </div>
      <div class="body">
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Just a reminder that you have an event tomorrow:</p>
        <div class="info-card">
          <div class="info-row">📅 <strong>Event:</strong> ${event.title}</div>
          <div class="info-row">⏰ <strong>Time:</strong> ${event.startTime ? (event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime) : 'Time TBA'}</div>
          <div class="info-row">📍 <strong>Venue:</strong> ${event.venue}</div>
        </div>
        <p>Don't forget to bring your QR code for check-in!</p>
      </div>
      <div class="footer"><p>EventGather</p></div>
    </div>
  `;

  return transporter.sendMail({
    from: `"EventGather" <${process.env.EMAIL_USER}>`,
    to,
    subject: `⏰ Reminder: ${event.title} is Tomorrow!`,
    html,
  });
};

export const sendPasswordResetEmail = async ({ to, userName, resetUrl }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Reset Password - EventGather</title></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f4;margin:0;padding:0">
      <div style="max-width:480px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px;text-align:center;color:white">
          <h1 style="margin:0;font-size:24px">Password Reset</h1>
        </div>
        <div style="padding:40px;color:#333">
          <p style="font-size:16px">Hi <strong>${userName}</strong>,</p>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Reset Password</a>
          </div>
          <p style="color:#888;font-size:14px">This link expires in 1 hour.</p>
          <p style="color:#888;font-size:14px">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="background:#f8f8f8;padding:24px;text-align:center;font-size:13px;color:#888">
          <p>EventGather — Connecting people through experiences</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return transporter.sendMail({
    from: `"EventGather" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Password Reset Request - EventGather',
    html,
  });
};

export const sendCancellationEmail = async ({ to, userName, event }) => {
  const html = `
    ${emailStyles}
    <div class="container">
      <div class="header" style="background: linear-gradient(135deg,#ef4444,#f97316);">
        <h1>Registration Cancelled</h1>
      </div>
      <div class="body">
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your registration for <strong>${event.title}</strong> has been cancelled.</p>
        <p>If this was a mistake, you can re-register on the platform as long as spots are available.</p>
      </div>
      <div class="footer"><p>EventGather</p></div>
    </div>
  `;

  return transporter.sendMail({
    from: `"EventGather" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Registration Cancelled: ${event.title}`,
    html,
  });
};

export const sendVerificationEmail = async ({ to, userName, verificationUrl }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Verify Email - EventGather</title></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f4;margin:0;padding:0">
      <div style="max-width:480px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px;text-align:center;color:white">
          <h1 style="margin:0;font-size:24px">Verify Your Email</h1>
        </div>
        <div style="padding:40px;color:#333">
          <p style="font-size:16px">Hi <strong>${userName}</strong>,</p>
          <p>Thanks for creating an account! Please verify your email address by clicking the button below:</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${verificationUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Verify Email</a>
          </div>
          <p style="color:#888;font-size:14px">This link expires in 24 hours.</p>
          <p style="color:#888;font-size:14px">If you didn't create this account, you can safely ignore this email.</p>
        </div>
        <div style="background:#f8f8f8;padding:24px;text-align:center;font-size:13px;color:#888">
          <p>EventGather — Connecting people through experiences</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return transporter.sendMail({
    from: `"EventGather" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your email - EventGather',
    html,
  });
};
