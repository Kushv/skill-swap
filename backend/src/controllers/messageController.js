import Message from '../models/Message.js';
import Match from '../models/Match.js';

// @desc    Get paginated message history
// @route   GET /api/messages/:matchId
// @access  Private
const getMessages = async (req, res, next) => {
    try {
         const { cursor } = req.query; // _id of the oldest message received (for pagination)
         const limit = 30;

         const match = await Match.findById(req.params.matchId);
         if (!match) {
             res.status(404);
             throw new Error('Match not found');
         }

         // Must be a participant in a connected match
         if (!match.users.some(id => id.toString() === req.user._id.toString())) {
              res.status(403);
              throw new Error('Not authorized to view messages for this match');
         }

         if (match.status !== 'connected') {
              res.status(403);
              throw new Error('Match is not connected');
         }

         const query = { matchId: match._id };
         if (cursor) {
             query._id = { $lt: cursor }; // cursor points to oldest message from previous fetch
         }

         const messages = await Message.find(query)
               .sort({ _id: -1 })         // newest first
               .limit(limit)
               .populate('sender', 'name avatar');

         // nextCursor is the _id of the OLDEST message in this batch (last in the array after desc sort)
         // so the next load-more call fetches messages older than that
         const hasMore = messages.length === limit;
         const nextCursor = hasMore ? messages[messages.length - 1]._id : null;

         // Mark messages from others as read
         await Message.updateMany(
             { matchId: match._id, sender: { $ne: req.user._id }, read: false },
             { $set: { read: true } }
         );

         res.status(200).json({
              success: true,
              data: messages, // newest-first; frontend reverses for display
              hasMore,
              nextCursor
         });
    } catch (error) {
         next(error);
    }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/:matchId/read
// @access  Private
const markMessagesRead = async (req, res, next) => {
    try {
        const match = await Match.findById(req.params.matchId);
        if (!match || !match.users.some(id => id.toString() === req.user._id.toString())) {
             res.status(404);
             throw new Error('Match not found or unauthorized');
        }

         await Message.updateMany(
             { matchId: req.params.matchId, sender: { $ne: req.user._id }, read: false },
             { $set: { read: true } }
         );

         res.status(200).json({ success: true, message: 'Messages marked read' });
    } catch (error) {
        next(error);
    }
};

export { getMessages, markMessagesRead };
