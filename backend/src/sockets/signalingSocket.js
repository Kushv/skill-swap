const signalingSocket = (io, socket) => {
    
    // Join WebRTC Room
    socket.on('join-room', ({ roomId, userId }) => {
        socket.join(roomId);
        const actualUserId = userId || socket.user._id;

        console.log(`[Video] User ${actualUserId} joined signaling room ${roomId}`);
        // Include socketId so the caller can target the specific peer for offer/answer
        socket.to(roomId).emit('user-joined', { userId: actualUserId, socketId: socket.id });
    });

    // WebRTC Offer — relay to specific peer or whole room
    socket.on('offer', ({ roomId, offer, targetSocketId }) => {
        const target = targetSocketId || roomId;
        socket.to(target).emit('offer', { offer, fromSocketId: socket.id });
    });

    // WebRTC Answer — relay to specific peer or whole room
    socket.on('answer', ({ roomId, answer, targetSocketId }) => {
        const target = targetSocketId || roomId;
        socket.to(target).emit('answer', { answer, fromSocketId: socket.id });
    });

    // WebRTC ICE Candidate — relay to specific peer or whole room
    socket.on('ice-candidate', ({ roomId, candidate, targetSocketId }) => {
        const target = targetSocketId || roomId;
        socket.to(target).emit('ice-candidate', { candidate, fromSocketId: socket.id });
    });

    // Leave Room
    socket.on('leave-room', ({ roomId }) => {
        socket.leave(roomId);
        console.log(`[Video] User ${socket.user._id} left signaling room ${roomId}`);
        socket.to(roomId).emit('user-left', { userId: socket.user._id });
    });

    // Whiteboard Collaboration
    socket.on('whiteboard-draw', ({ roomId, drawData }) => {
        socket.to(roomId).emit('whiteboard-draw', { drawData, senderId: socket.user._id });
    });

    socket.on('whiteboard-clear', ({ roomId }) => {
        socket.to(roomId).emit('whiteboard-clear');
    });

    // In-Call Text Chat — event name matches useVideoCall hook
    socket.on('call-chat-message', ({ roomId, message }) => {
        socket.to(roomId).emit('call-chat-message', {
            message,
            senderId: socket.user._id,
            timestamp: new Date(),
        });
    });
};

export default signalingSocket;
