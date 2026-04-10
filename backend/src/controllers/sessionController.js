import Session from '../models/Session.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { awardXP, XP_REWARDS } from '../utils/xpService.js';
import { v4 as uuidv4 } from 'uuid';
import { getIO } from '../sockets/index.js';

// @desc    Create a session request
// @route   POST /api/sessions
// @access  Private
const createSession = async (req, res, next) => {
    try {
        const { matchId, scheduledAt, duration, skillFocus } = req.body;

        // --- Pre-validate scheduledAt before hitting Mongoose ---
        if (!scheduledAt) {
            res.status(400);
            throw new Error('scheduledAt is required. Send an ISO date string, e.g. "2025-12-25T10:00:00.000Z"');
        }
        const parsedDate = new Date(scheduledAt);
        if (isNaN(parsedDate.getTime())) {
            res.status(400);
            throw new Error(`scheduledAt is not a valid date: "${scheduledAt}". Use ISO format.`);
        }

        // --- Pre-validate duration ---
        const parsedDuration = Number(duration);
        if (![30, 60].includes(parsedDuration)) {
            res.status(400);
            throw new Error('duration must be 30 or 60 (minutes)');
        }

        const match = await Match.findById(matchId);

        if (!match) {
             res.status(404);
             throw new Error('Match not found');
        }

        // Safe ObjectId comparison
        if (!match.users.some(id => id.toString() === req.user._id.toString())) {
             res.status(403);
             throw new Error('Not authorized for this match');
        }

        const session = await Session.create({
            matchId,
            participants: match.users,
            scheduledAt: parsedDate,       // use pre-validated Date object
            duration: parsedDuration,      // use pre-validated number
            skillFocus,
            status: 'pending',
            initiatedBy: req.user._id
        });

        // Notify other participant via socket
        try {
            const io = getIO();
            const otherUserId = match.users.find(id => id.toString() !== req.user._id.toString());
            if (io && otherUserId) {
                io.to(otherUserId.toString()).emit('session-request', {
                    session,
                    from: req.user._id,
                });
            }
        } catch (_) {
            // socket may not be initialized in tests — non-fatal
        }

        res.status(201).json({ success: true, data: session });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all sessions for current user
// @route   GET /api/sessions/my-sessions
// @access  Private
const getMySessions = async (req, res, next) => {
    try {
         const sessions = await Session.find({
              participants: req.user._id
         })
             .populate('participants', 'name avatar')
             .populate('matchId')
             .sort({ scheduledAt: 1 });

         res.status(200).json({ success: true, data: sessions });
    } catch (error) {
         next(error);
    }
};

// @desc    Get single session
// @route   GET /api/sessions/:sessionId
// @access  Private
const getSessionById = async (req, res, next) => {
    try {
        const session = await Session.findById(req.params.sessionId)
             .populate('participants', 'name avatar');

        if (!session) {
            res.status(404);
            throw new Error('Session not found');
        }

        if (!session.participants.some(p => p._id.toString() === req.user._id.toString())) {
             res.status(403);
             throw new Error('Not authorized to view session');
        }

        res.status(200).json({ success: true, data: session });
    } catch (error) {
        next(error);
    }
};

// @desc    Update session (accept/cancel/reschedule)
// @route   PUT /api/sessions/:sessionId
// @access  Private
const updateSession = async (req, res, next) => {
     try {
         const { status, counterProposal } = req.body;
         const session = await Session.findById(req.params.sessionId);

         if (!session) {
             res.status(404);
             throw new Error('Session not found');
         }

         if (!session.participants.some(id => id.toString() === req.user._id.toString())) {
             res.status(403);
             throw new Error('Not authorized');
         }

         if (status === 'confirmed' && session.status !== 'confirmed') {
             // Generate WebRTC meeting room UUID on first confirmation
             session.meetingRoomId = uuidv4();
         }

         if (status === 'rescheduled' && counterProposal) {
              session.counterProposal = {
                   proposedBy: req.user._id,
                   newTime: counterProposal.newTime,
                   proposedAt: Date.now()
              };
         }

         // Save status for ALL transitions including 'rescheduled'
         if (status) {
              session.status = status;
              if (status === 'confirmed' && session.counterProposal?.newTime) {
                   // Only apply the counter-proposed time if newTime was actually set
                   session.scheduledAt = session.counterProposal.newTime;
                   session.counterProposal = undefined;
               }
         }

         await session.save();

         // Notify other participant via socket
         try {
             const io = getIO();
             const otherId = session.participants.find(id => id.toString() !== req.user._id.toString());
             if (io && otherId) {
                 io.to(otherId.toString()).emit('session-update', {
                     sessionId: session._id,
                     status: session.status,
                 });
             }
         } catch (_) {
             // non-fatal
         }

         res.status(200).json({ success: true, data: session });
     } catch (error) {
         next(error);
     }
};

// @desc    Complete session and award XP
// @route   POST /api/sessions/:sessionId/complete
// @access  Private
const completeSession = async (req, res, next) => {
    try {
        const session = await Session.findById(req.params.sessionId);

        if (!session) {
            res.status(404);
            throw new Error('Session not found');
        }

        if (!session.participants.some(id => id.toString() === req.user._id.toString())) {
             res.status(403);
             throw new Error('Not authorized');
        }

        // Idempotent — return success if already completed
        if (session.status === 'completed') {
             return res.status(200).json({ success: true, data: session });
        }

        session.status = 'completed';
        session.completedAt = Date.now();
        
        // Award XP exactly once
        if (!session.xpAwarded) {
             for (const participantId of session.participants) {
                 await awardXP(participantId, XP_REWARDS.SESSION_COMPLETED, 'Session Completion');
                 
                 // Update total sessions
                 await User.findByIdAndUpdate(participantId, {
                     $inc: { 
                         totalSessionsCompleted: 1,
                         totalHoursTaught: (session.duration / 60)
                     }
                 });
             }
             session.xpAwarded = true;
        }

        await session.save();

        res.status(200).json({ success: true, data: session });
    } catch (error) {
        next(error);
    }
};

export {
    createSession,
    getMySessions,
    getSessionById,
    updateSession,
    completeSession
};
