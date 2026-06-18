import express from 'express';
import { body } from 'express-validator';
import {
  register, login, getMe, updateProfile, changePassword,
  forgotPassword, resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Update registerValidation in routes/auth.js:
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2–50 characters')
    .escape(),
  body('email').isEmail().normalizeEmail()
    .withMessage('Enter a valid email')
    .customSanitizer(value => value.toLowerCase()),
  body('password').isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('department').trim().escape(),
  body('phone').trim().escape(),
];
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('profilePicture'), updateProfile);
router.put('/change-password', protect, changePassword);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;
