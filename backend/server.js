import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import dotenv from 'dotenv';
import { initSocket } from './src/sockets/index.js';

dotenv.config();

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}).catch((err) => {
  console.error(`MongoDB connection failed: ${err.message}`);
  process.exit(1);
});
