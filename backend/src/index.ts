import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config/env.js';
import { closeDatabase } from './config/database.js';
import { initializeSocket, closeSocket } from './config/socket.js';
import { requestLogger, errorHandler, notFoundHandler } from './middleware/common.js';

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

import rateLimit from 'express-rate-limit';

// Global rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per 15 minutes
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(limiter);
app.use(requestLogger);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'sqlite',
    });
});

// Root endpoint for convenience
app.get('/', (req, res) => {
    res.json({
        message: 'VocalPulse Backend API is running',
        docs: '/docs', // Placeholder if we get docs later
        health: '/api/health'
    });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/ai', aiRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/followups', followupsRouter);

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
║  💾 Database:  SQLite (file-based)                    ║
║  🔌 Socket.io: Ready                                  ║
╚══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = async () => {
    console.log('\nShutting down...');
    closeSocket();
    closeDatabase();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
