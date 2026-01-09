import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config/env.js';
import { connectDB, closeDatabase } from './config/database.js'; // Updated import
import { initializeSocket, closeSocket } from './config/socket.js';
import { requestLogger, errorHandler, notFoundHandler } from './middleware/common.js';
// Remove SQLite sync service as Redis/Memory is used or should be updated to Mongo later
// import { leaderboardService } from './services/leaderboard.service.js';

// Routes
import authRouter from './routes/auth.js';
import leadsRouter from './routes/leads.js';
import callsRouter from './routes/calls.js';
import analyticsRouter from './routes/analytics.js';
import leaderboardRouter from './routes/leaderboard.js';
import aiRouter from './routes/ai.js';
import webhookRouter from './routes/webhooks.js';
import followupsRouter from './routes/followups.js';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

// Connect to MongoDB
connectDB();

import rateLimit from 'express-rate-limit';

// Global rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Increased for demo/manager usage
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

import cookieParser from 'cookie-parser';

// Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(limiter);
app.use(requestLogger);

// Health check
app.get('/api/health', (req, res) => {
    // Check connection state: 1 = connected
    const status = import('./config/database.js').then(m => m.mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'mongodb',
    });
});

// Root endpoint for convenience
app.get('/', (req, res) => {
    res.json({
        message: 'VocalPulse Backend API is running (MERN Stack)',
        docs: '/docs', // Placeholder if we get docs later
        health: '/api/health'
    });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/calls', callsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/webhooks', webhookRouter);
app.use('/api/v1/followups', followupsRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
httpServer.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║                  VocalPulse Backend                   ║
╠══════════════════════════════════════════════════════╣
║  🚀 Server:    http://localhost:${config.port}                 ║
║  📊 Health:    http://localhost:${config.port}/api/health      ║
║  💾 Database:  MongoDB                                ║
║  🔌 Socket.io: Ready                                  ║
╚══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = async () => {
    console.log('\nShutting down...');
    closeSocket();
    await closeDatabase(); // Await mongo close
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
