import express from 'express';
import {
  signup,
  verifyOtp,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

export default router;
