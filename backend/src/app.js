import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

dotenv.config();

const app = express();

// Trust proxy for PaaS deployments (Render, Heroku) so rate limiter works correctly
app.set('trust proxy', 1);

// ─── Body Parsing Middleware (MUST be before routes and rate limiter) ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── CORS ───
// Support multiple CLIENT_URLs as comma-separated list
// e.g. CLIENT_URL="https://foo.netlify.app,https://custom-domain.com"
const rawClientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(u => u.trim().replace(/\/$/, ''))
  : [];

const allowedOrigins = [
  ...rawClientUrls,
  'http://localhost:5173',
  'http://localhost:8080',
  'http://10.12.43.156:8080',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, SSR)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.error(`CORS blocked: origin "${origin}" — allowed:`, allowedOrigins);
    return callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: true, // Required for cookies (refreshToken)
  optionsSuccessStatus: 200,
};

// Handle preflight OPTIONS for all routes FIRST
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ─── Security Middlewares ───
app.use(helmet());

// ─── Rate Limiting (auth routes only) ───
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Routes ───
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'API is running', env: process.env.NODE_ENV });
});

// ─── Error Handling ───
app.use(notFound);
app.use(errorHandler);

export default app;
