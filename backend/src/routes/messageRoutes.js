import express from 'express';
import {
    getMessages,
    markMessagesRead
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:matchId', protect, getMessages);
router.put('/:matchId/read', protect, markMessagesRead);

export default router;
