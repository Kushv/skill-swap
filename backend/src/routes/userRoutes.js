import express from 'express';
import multer from 'multer';
import {
  getMe,
  updateMe,
  completeOnboarding,
  getUserById,
  getLeaderboard,
  uploadAvatar
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Memory storage for multer before passing to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

router.get('/leaderboard', protect, getLeaderboard);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/me/onboarding', protect, completeOnboarding);
router.post('/me/avatar', protect, upload.single('image'), uploadAvatar);

// Must be at the bottom to avoid catching 'me' or 'leaderboard'
router.get('/:userId', protect, getUserById);

export default router;
