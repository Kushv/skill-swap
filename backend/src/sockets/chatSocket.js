import Message from '../models/Message.js';
import Match from '../models/Match.js';

const chatSocket = (io, socket) => {
    
    // Join a match chat room — only if the match is 'connected'
    socket.on('join-match', async ({ matchId }) => {
        try {
            const match = await Match.findById(matchId);
            if (
                match &&
                match.status === 'connected' &&
                match.users.some(id => id.toString() === socket.user._id.toString())
            ) {
                socket.join(matchId);
                console.log(`[Chat] User ${socket.user.name} joined match room ${matchId}`);
            } else {
                console.warn(`[Chat] User ${socket.user._id} denied join-match for ${matchId} (not connected or not a participant)`);
            }
        } catch (error) {
            console.error('[Chat] Error joining match room:', error);
        }
    });

    // Leave a match chat room
    socket.on('leave-match', ({ matchId }) => {
        socket.leave(matchId);
    });

    // Send message — only between users in a connected match
    socket.on('send-message', async ({ matchId, content, type }) => {
        try {
            if (!content?.trim()) return;

            const match = await Match.findById(matchId);
            if (
                !match ||
                match.status !== 'connected' ||
                !match.users.some(id => id.toString() === socket.user._id.toString())
            ) {
                return socket.emit('error', { message: 'Cannot send message — not connected' });
            }

            const message = await Message.create({
                matchId,
                sender: socket.user._id,
                content: content.trim(),
                type: type || 'text'
            });

            const populatedMessage = await Message.findById(message._id)
                 .populate('sender', 'name avatar');

            // Broadcast to the match room
            io.to(matchId).emit('receive-message', {
                _id: populatedMessage._id,
                matchId: populatedMessage.matchId,
                sender: populatedMessage.sender,
                content: populatedMessage.content,
                type: populatedMessage.type,
                read: populatedMessage.read,
                createdAt: populatedMessage.createdAt,
            });
        } catch (error) {
            console.error('[Chat] Error sending message:', error);
            socket.emit('error', { message: 'Message failed' });
        }
    });

    // Typing indicators
    socket.on('typing', ({ matchId }) => {
        socket.to(matchId).emit('user-typing', { userId: socket.user._id, matchId });
    });

    socket.on('stop-typing', ({ matchId }) => {
        socket.to(matchId).emit('user-stop-typing', { userId: socket.user._id, matchId });
    });

    // Mark messages as read
    socket.on('mark-read', async ({ matchId }) => {
        try {
            await Message.updateMany(
                { matchId, sender: { $ne: socket.user._id }, read: false },
                { $set: { read: true } }
            );

            io.to(matchId).emit('messages-read', { matchId, readBy: socket.user._id });
        } catch (error) {
            console.error('[Chat] Error marking messages read in socket:', error);
        }
    });
};

export default chatSocket;
