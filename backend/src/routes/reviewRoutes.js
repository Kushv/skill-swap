import express from 'express';
import {
    submitReview,
    getUserReviews,
    getSessionReviews
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, submitReview);
router.get('/user/:userId', protect, getUserReviews);
router.get('/session/:sessionId', protect, getSessionReviews);

export default router;
