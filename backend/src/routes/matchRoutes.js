import express from 'express';
import {
    recommendMatches,
    connectUser,
    respondToRequest,
    getMyConnections,
    getMyMatches,
    getMatchById,
    updateMatchStatus,
} from '../controllers/matchController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/recommend',        protect, recommendMatches);
router.post('/connect',          protect, connectUser);
router.get('/connections',       protect, getMyConnections);   // NEW
router.get('/my-matches',        protect, getMyMatches);
router.put('/:matchId/respond',  protect, respondToRequest);   // NEW
router.get('/:matchId',          protect, getMatchById);
router.put('/:matchId/status',   protect, updateMatchStatus);

export default router;
