import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { config } from './env.js';
import { getTopRankings } from './redis.js';

let io: SocketIOServer;

export function initializeSocket(httpServer: HTTPServer): SocketIOServer {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: config.cors.origin,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000, // Heartbeat to prevent zombie connections
    });

    // Main namespace for general events
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        socket.on('join_org', (orgId: string) => {
            socket.join(`org:${orgId}`);
            console.log(`📍 Socket ${socket.id} joined org:${orgId}`);
        });

        socket.on('disconnect', (reason) => {
            console.log(`🔌 Client disconnected: ${socket.id} - ${reason}`);
        });
    });

    // Leaderboard namespace with heartbeat
    const leaderboardNs = io.of('/leaderboard');

    leaderboardNs.on('connection', (socket) => {
        console.log(`🏆 Leaderboard client connected: ${socket.id}`);

        socket.on('join_org', async (orgId: string) => {
            socket.join(`org:${orgId}`);

            // Send initial rankings on join
            const rankings = await getTopRankings(orgId, 10);
            socket.emit('rank_update', rankings);
        });

        // Heartbeat handler
        socket.on('heartbeat', () => {
            socket.emit('heartbeat_ack', { timestamp: Date.now() });
        });

        socket.on('disconnect', (reason) => {
            console.log(`🏆 Leaderboard client disconnected: ${socket.id} - ${reason}`);
        });
    });

    // War Room namespace for celebrations
    const warRoomNs = io.of('/warroom');

    warRoomNs.on('connection', (socket) => {
        console.log(`⚔️ War Room client connected: ${socket.id}`);

        socket.on('join_org', (orgId: string) => {
            socket.join(`org:${orgId}`);
        });

        socket.on('disconnect', () => {
            console.log(`⚔️ War Room client disconnected: ${socket.id}`);
        });
    });

    return io;
}

export function getIO(): SocketIOServer {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}

export function closeSocket(): void {
    if (io) {
        io.close();
    }
}

// ============================================
// EMIT HELPERS
// ============================================

/**
 * Emit leaderboard update to all clients in an org
 */
export async function emitLeaderboardUpdate(
    orgId: string,
    rankings: { repId: string; xp: number; rank: number }[]
): Promise<void> {
    const leaderboardNs = io.of('/leaderboard');
    leaderboardNs.to(`org:${orgId}`).emit('rank_update', rankings);
}

/**
 * Emit new call activity to War Room
 */
export function emitCallActivity(
    orgId: string,
    activity: {
        repId: string;
        repName: string;
        type: 'call_made' | 'call_answered' | 'conversion';
        leadName?: string;
        duration?: number;
        xpEarned?: number;
    }
): void {
    const warRoomNs = io.of('/warroom');
    warRoomNs.to(`org:${orgId}`).emit('activity', activity);
}

/**
 * Emit milestone celebration
 */
export function emitMilestone(
    orgId: string,
    milestone: {
        repId: string;
        repName: string;
        type: 'calls_milestone' | 'conversion' | 'top_rank' | 'speed_bonus' | 'quality_bonus' | 'ai_quality_star' | 'ai_quality_good';
        value: number;
        message: string;
    }
): void {
    const warRoomNs = io.of('/warroom');
    warRoomNs.to(`org:${orgId}`).emit('milestone', milestone);
}

/**
 * Emit ghost sync notification
 */
export function emitGhostSync(
    orgId: string,
    data: {
        repId: string;
        repName: string;
        callDuration: number;
        leadPhone: string;
    }
): void {
    io.to(`org:${orgId}`).emit('ghost_sync', data);
}
