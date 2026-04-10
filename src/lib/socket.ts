import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initiateSocketConnection = (token: string) => {
  // Create new connection if none exists OR if the existing one is disconnected
  if (!socket || !socket.connected) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token,
      },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
    return socket;
}
