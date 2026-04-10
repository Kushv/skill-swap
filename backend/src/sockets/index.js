import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import chatSocket from './chatSocket.js';
import signalingSocket from './signalingSocket.js';

let io;

export const initSocket = (server) => {
    const allowedOrigins = [
        process.env.CLIENT_URL,
        'http://localhost:5173',
        'http://localhost:8080',
        'http://10.12.43.156:8080',
    ].filter(Boolean);

    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error(`Socket CORS: origin "${origin}" not allowed`));
                }
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.name} (${socket.user._id})`);

        // Join personal room based on user ID for direct notifications
        socket.join(socket.user._id.toString());

        // Initialize domain-specific sockets
        chatSocket(io, socket);
        signalingSocket(io, socket);

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.name}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
