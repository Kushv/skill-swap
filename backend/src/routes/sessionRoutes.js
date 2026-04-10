import express from 'express';
import {
    createSession,
    getMySessions,
    getSessionById,
    updateSession,
    completeSession
} from '../controllers/sessionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createSession);
router.get('/my-sessions', protect, getMySessions);
router.get('/:sessionId', protect, getSessionById);
router.put('/:sessionId', protect, updateSession);
router.post('/:sessionId/complete', protect, completeSession);

export default router;
