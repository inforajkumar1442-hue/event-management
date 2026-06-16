import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../utils/email.js';


// @POST /api/auth/register
export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let { name, email, password, department, phone } = req.body;
  
  // ✅ ADD SANITIZATION
  name = name?.trim().replace(/[<>]/g, '');
  email = email?.toLowerCase().trim();
  department = department?.trim().replace(/[<>]/g, '');
  phone = phone?.trim().replace(/[^0-9+\-\s]/g, '');

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const user = await User.create({ name, email, password, department, phone });
  const token = generateToken(user._id);

  res.status(201).json({
    message: 'Registration successful',
    token,
    user,
  });
};

// @POST /api/auth/login
export const login = async (req, res) => {
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
      message: 'This email is not registered in our system. Please check your email or sign up.' 
    });
  }

  // Case 2: Email exists but password is incorrect
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({ 
      message: 'Incorrect password. Please try again.' 
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
};

// @GET /api/auth/me
export const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ user });
};

// @PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  const { name, department, phone } = req.body;
  const updates = { name, department, phone };

  if (req.file) {
    updates.profilePicture = `/uploads/${req.file.filename}`;
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ message: 'Profile updated', user });
};

// @PUT /api/auth/change-password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password changed successfully' });
};

// @POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always return success even if email not found (security best practice)
  if (!user) {
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
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
};

// @POST /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const jwtToken = generateToken(user._id);

  res.json({
    message: 'Password reset successful',
    token: jwtToken,
    user,
  });
};
