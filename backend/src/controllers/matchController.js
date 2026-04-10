import Match from '../models/Match.js';
import User from '../models/User.js';
import axios from 'axios';
import { getIO } from '../sockets/index.js';

// ── Helper: get io without crashing if not yet initialized ──
const safeGetIO = () => {
    try { return getIO(); } catch { return null; }
};

// @desc    Get recommendations (AI with basic fallback)
// @route   POST /api/matches/recommend
// @access  Private
const recommendMatches = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).lean();
        if (!user) { res.status(404); throw new Error('User not found'); }

        const existingMatchDocs = await Match.find({ users: req.user._id }).select('users').lean();
        const alreadyMatchedUserIds = existingMatchDocs
            .flatMap(m => m.users.map(u => u.toString()))
            .filter(id => id !== req.user._id.toString());

        const excludeIds = [req.user._id.toString(), ...alreadyMatchedUserIds];

        const candidates = await User.find({ _id: { $nin: excludeIds } })
            .select('name avatar skillsToTeach skillsToLearn learningStyle xpPoints averageRating mentorLevel lastActive')
            .lean();

        console.log(`[Match] ${candidates.length} candidate(s) found for user ${user.name}`);
        if (candidates.length === 0) return res.status(200).json({ success: true, data: [] });

        let aiMatches = null;
        if (user.skillsToTeach?.length > 0 || user.skillsToLearn?.length > 0) {
            try {
                const payload = {
                    userId: user._id.toString(),
                    skillsToTeach: (user.skillsToTeach || []).map(s => s.name),
                    skillsToLearn: (user.skillsToLearn || []).map(s => s.name),
                    learningStyle: user.learningStyle || 'practical',
                    existingConnections: excludeIds,
                };
                const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
                const response = await axios.post(`${aiServiceUrl}/match`, payload, { timeout: 5000 });
                if (response.data?.matches?.length > 0) {
                    aiMatches = response.data.matches;
                    console.log(`[Match] AI service returned ${aiMatches.length} match(es)`);
                }
            } catch (aiErr) {
                console.warn('[Match] AI service unavailable, using basic matching:', aiErr.message);
            }
        }

        // Fallback basic scoring
        if (!aiMatches) {
            const myTeach = (user.skillsToTeach || []).map(s => s.name?.toLowerCase().trim()).filter(Boolean);
            const myLearn = (user.skillsToLearn || []).map(s => s.name?.toLowerCase().trim()).filter(Boolean);

            aiMatches = candidates.map(candidate => {
                const theirTeach = (candidate.skillsToTeach || []).map(s => s.name?.toLowerCase().trim()).filter(Boolean);
                const theirLearn = (candidate.skillsToLearn || []).map(s => s.name?.toLowerCase().trim()).filter(Boolean);

                const iTeachTheyWant = myTeach.filter(s => theirLearn.includes(s)).length;
                const theyTeachIWant = theirTeach.filter(s => myLearn.includes(s)).length;

                let score = 25;
                const reasons = [];
                if (iTeachTheyWant > 0 && theyTeachIWant > 0) { score = 90 + Math.min(iTeachTheyWant + theyTeachIWant, 10); reasons.push('Perfect skill swap'); }
                else if (theyTeachIWant > 0) { score = 60 + Math.min(theyTeachIWant * 10, 20); reasons.push('They teach what you want to learn'); }
                else if (iTeachTheyWant > 0) { score = 55 + Math.min(iTeachTheyWant * 10, 20); reasons.push('You teach what they want to learn'); }
                else reasons.push('New connection opportunity');

                return {
                    userId: candidate._id.toString(),
                    _id: candidate._id,
                    name: candidate.name,
                    avatar: candidate.avatar,
                    mentorLevel: candidate.mentorLevel,
                    averageRating: candidate.averageRating || 0,
                    skillsToTeach: (candidate.skillsToTeach || []).map(s => s.name),
                    skillsToLearn: (candidate.skillsToLearn || []).map(s => s.name),
                    learningStyle: candidate.learningStyle,
                    xpPoints: candidate.xpPoints,
                    matchScore: Math.min(score, 100),
                    matchReasons: reasons,
                };
            });
            aiMatches.sort((a, b) => b.matchScore - a.matchScore);
        }

        return res.status(200).json({ success: true, data: aiMatches });
    } catch (error) {
        next(error);
    }
};

// @desc    Send a connection request
// @route   POST /api/matches/connect
// @access  Private
const connectUser = async (req, res, next) => {
    try {
        // Accept both targetUserId (legacy) and receiverId (new)
        const receiverId = req.body.receiverId || req.body.targetUserId;

        if (!receiverId) { res.status(400); throw new Error('Please provide receiverId'); }
        if (receiverId === req.user._id.toString()) { res.status(400); throw new Error('Cannot connect to yourself'); }

        const receiver = await User.findById(receiverId).select('name avatar');
        if (!receiver) { res.status(404); throw new Error('User not found'); }

        const existingMatch = await Match.findOne({ users: { $all: [req.user._id, receiverId] } });
        if (existingMatch) { res.status(400); throw new Error('Connection request already exists'); }

        const match = await Match.create({
            users: [req.user._id, receiverId],
            status: 'pending',
            initiatedBy: req.user._id,
        });

        const populatedMatch = await Match.findById(match._id)
            .populate('users', 'name avatar mentorLevel skillsToTeach skillsToLearn')
            .populate('initiatedBy', 'name avatar');

        // Real-time notification to receiver
        const io = safeGetIO();
        if (io) {
            io.to(receiverId.toString()).emit('connection-request', {
                match: populatedMatch,
                from: { _id: req.user._id, name: req.user.name },
                message: `${req.user.name} sent you a connection request`,
            });
        }

        res.status(201).json({ success: true, message: 'Connection request sent', data: populatedMatch });
    } catch (error) {
        next(error);
    }
};

// @desc    Accept or reject a connection request
// @route   PUT /api/matches/:matchId/respond
// @access  Private
const respondToRequest = async (req, res, next) => {
    try {
        const { matchId } = req.params;
        const { action } = req.body; // 'accept' or 'reject'
        const userId = req.user._id.toString();

        if (!['accept', 'reject'].includes(action)) {
            res.status(400); throw new Error("action must be 'accept' or 'reject'");
        }

        const match = await Match.findById(matchId)
            .populate('users', 'name avatar mentorLevel skillsToTeach skillsToLearn averageRating xpPoints')
            .populate('initiatedBy', '_id name avatar');

        if (!match) { res.status(404); throw new Error('Match not found'); }

        // Only the receiver (not the sender) can respond
        if (match.initiatedBy._id.toString() === userId) {
            res.status(403); throw new Error('Cannot respond to your own request');
        }

        const isParticipant = match.users.some(u => u._id.toString() === userId);
        if (!isParticipant) { res.status(403); throw new Error('Not authorized'); }

        if (action === 'accept') {
            match.status = 'connected';
            match.connectedAt = new Date();
            await User.findByIdAndUpdate(match.users[0]._id, { $addToSet: { connections: match.users[1]._id } });
            await User.findByIdAndUpdate(match.users[1]._id, { $addToSet: { connections: match.users[0]._id } });
        } else {
            match.status = 'rejected';
        }

        await match.save();

        // Notify the sender
        const io = safeGetIO();
        if (io) {
            const senderId = match.initiatedBy._id.toString();
            io.to(senderId).emit(action === 'accept' ? 'request-accepted' : 'request-rejected', {
                match,
                by: { _id: userId, name: req.user.name },
                message: action === 'accept'
                    ? `${req.user.name} accepted your connection request!`
                    : `${req.user.name} declined your connection request.`,
            });
        }

        res.json({ success: true, data: match });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all connections and requests for current user
// @route   GET /api/matches/connections
// @access  Private
const getMyConnections = async (req, res, next) => {
    try {
        const userId = req.user._id.toString();

        const allMatches = await Match.find({
            users: req.user._id,
            status: { $in: ['pending', 'connected'] },
        })
        .populate('users', 'name avatar mentorLevel skillsToTeach skillsToLearn averageRating xpPoints')
        .populate('initiatedBy', '_id name avatar')
        .sort({ createdAt: -1 })
        .lean();

        const received = allMatches.filter(m => m.status === 'pending' && m.initiatedBy._id.toString() !== userId);
        const sent     = allMatches.filter(m => m.status === 'pending' && m.initiatedBy._id.toString() === userId);
        const connected = allMatches.filter(m => m.status === 'connected');

        res.json({
            success: true,
            data: {
                received,
                sent,
                connected,
                counts: {
                    received: received.length,
                    sent: sent.length,
                    connected: connected.length,
                    pendingTotal: received.length + sent.length,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all matches for current user
// @route   GET /api/matches/my-matches
// @access  Private
const getMyMatches = async (req, res, next) => {
    try {
        const matches = await Match.find({ users: req.user._id })
            .populate('users', 'name avatar mentorLevel skillsToTeach skillsToLearn lastActive');
        res.status(200).json({ success: true, data: matches });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single match by ID
// @route   GET /api/matches/:matchId
// @access  Private
const getMatchById = async (req, res, next) => {
    try {
        const match = await Match.findById(req.params.matchId)
            .populate('users', 'name avatar mentorLevel skillsToTeach skillsToLearn lastActive completedSessions');
        if (!match) { res.status(404); throw new Error('Match not found'); }
        if (!match.users.some(u => u._id.toString() === req.user._id.toString())) {
            res.status(403); throw new Error('Not authorized to view this match');
        }
        res.status(200).json({ success: true, data: match });
    } catch (error) {
        next(error);
    }
};

// @desc    Update match status (legacy)
// @route   PUT /api/matches/:matchId/status
// @access  Private
const updateMatchStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const match = await Match.findById(req.params.matchId);
        if (!match) { res.status(404); throw new Error('Match not found'); }
        if (!match.users.includes(req.user._id)) { res.status(403); throw new Error('Not authorized to modify this match'); }

        match.status = status;
        if (status === 'connected') {
            match.connectedAt = Date.now();
            await User.updateMany({ _id: { $in: match.users } }, { $addToSet: { connections: match.users } });
        }
        await match.save();
        res.status(200).json({ success: true, data: match });
    } catch (error) {
        next(error);
    }
};

export {
    recommendMatches,
    connectUser,
    respondToRequest,
    getMyConnections,
    getMyMatches,
    getMatchById,
    updateMatchStatus,
};
