import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/email.js';
import logger from '../utils/logger.js';


// @POST /api/auth/register
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { name, email, password, department, phone } = req.body;
    
    // ADD SANITIZATION
    name = name?.trim().replace(/[<>]/g, '');
    email = email?.toLowerCase().trim();
    department = department?.trim().replace(/[<>]/g, '');
    phone = phone?.trim().replace(/[^0-9+\-\s]/g, '');

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, department, phone });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;

    // Send verification email (don't block response on failure)
    sendVerificationEmail({
      to: user.email,
      userName: user.name,
      verificationUrl,
    }).catch(err => logger.error('Failed to send verification email:', err));

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      token,
      user,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

// @POST /api/auth/login
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email?.toLowerCase().trim();
    const password = req.body.password;

    // First, check if user exists with this email
    const user = await User.findOne({ email }).select('+password');
    
    // Case 1: Email doesn't exist in database
    if (!user) {
      return res.status(401).json({ 
        message: 'Your email is not registered. Kindly sign up first.' 
      });
    }

    // Case 2: Email exists but password is incorrect
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Your password is incorrect. Kindly enter your correct password.' 
      });
    }

    // Case 3: Account is deactivated
    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Your account has been deactivated. Please contact support.' 
      });
    }

    // Successful login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

// @GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

// @PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const { name, department, phone } = req.body;
    const updates = { name, department, phone };

    if (req.file) {
      updates.profilePicture = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// @PUT /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({ message: 'New password cannot be your current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

// @POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email?.toLowerCase().trim();
    const user = await User.findOne({ email });

    // Always return success even if email not found (security best practice)
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl,
      });
      logger.info(`Password reset email sent to ${email}`);
      res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error('Failed to send password reset email:', err);
      res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
    }
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
};

// @POST /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      logger.warn(`Invalid or expired reset token used: ${token.substring(0, 8)}...`);
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const jwtToken = generateToken(user._id);

    logger.info(`Password reset successful for user ${user.email}`);
    res.json({
      message: 'Password reset successful',
      token: jwtToken,
      user,
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// @GET /api/auth/verify-email/:token
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      logger.warn(`Invalid or expired email verification token used`);
      return res.status(400).json({ message: 'Invalid or expired verification link.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    logger.info(`Email verified for user ${user.email}`);
    res.json({ message: 'Email verified successfully. You can now access all features.' });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ message: 'Failed to verify email' });
  }
};

// @POST /api/auth/resend-verification
export const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;

    await sendVerificationEmail({
      to: user.email,
      userName: user.name,
      verificationUrl,
    });

    logger.info(`Verification email resent to ${user.email}`);
    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend verification email' });
  }
};
