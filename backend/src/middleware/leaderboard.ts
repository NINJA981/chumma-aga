import { Request, Response, NextFunction } from 'express';
import { updateLeaderboardScore, getTopRankings } from '../config/redis.js';
import { emitLeaderboardUpdate, emitCallActivity, emitMilestone } from '../config/socket.js';
import { query, execute, generateId } from '../config/database.js';

// XP calculation constants
const XP_PER_CALL = 10;
const XP_PER_TALK_MINUTE = 5;
const XP_PER_CONVERSION = 100;
const XP_PENALTY_MISSED_FOLLOWUP = 50;

export interface CallData {
    repId: string;
    orgId: string;
    repName: string;
    durationSeconds: number;
    isAnswered: boolean;
    disposition?: string;
    leadName?: string;
}

/**
 * Calculate XP from call data
 * Formula: (Calls * 10) + (TalkMinutes * 5) + (Conversions * 100) - (MissedFollowups * 50)
 */
export function calculateCallXP(data: CallData): number {
    let xp = XP_PER_CALL;

    if (data.isAnswered && data.durationSeconds > 0) {
        const talkMinutes = Math.ceil(data.durationSeconds / 60);
        xp += talkMinutes * XP_PER_TALK_MINUTE;
    }

    if (data.disposition === 'converted') {
        xp += XP_PER_CONVERSION;
    }

    return xp;
}

/**
 * Middleware to update leaderboard after call is saved
 */
export async function updateLeaderboardMiddleware(
    callData: CallData
): Promise<void> {
    const xpDelta = calculateCallXP(callData);

    // Update in-memory leaderboard
    const newScore = await updateLeaderboardScore(callData.orgId, callData.repId, xpDelta);

    // Record XP history (SQLite uses ? placeholders)
    try {
        execute(
            `INSERT INTO rep_xp_history (id, rep_id, xp_delta, reason) VALUES (?, ?, ?, ?)`,
            [generateId(), callData.repId, xpDelta, 'call']
        );
    } catch (e) {
        console.error('Failed to record XP history:', e);
    }

    // Get updated rankings
    const rankings = await getTopRankings(callData.orgId, 10);

    // Emit to all connected clients
    await emitLeaderboardUpdate(callData.orgId, rankings);

    // Emit call activity
    emitCallActivity(callData.orgId, {
        repId: callData.repId,
        repName: callData.repName,
        type: callData.isAnswered ? 'call_answered' : 'call_made',
        leadName: callData.leadName,
        duration: callData.durationSeconds,
    });

    // Check for milestones
    await checkMilestones(callData, newScore, rankings);
}

/**
 * Check and emit milestones
 */
async function checkMilestones(
    callData: CallData,
    newScore: number,
    rankings: { repId: string; xp: number; rank: number }[]
): Promise<void> {
    // Check if rep hit conversion
    if (callData.disposition === 'converted') {
        emitMilestone(callData.orgId, {
            repId: callData.repId,
            repName: callData.repName,
            type: 'conversion',
            value: 1,
            message: `🎉 ${callData.repName} just closed a deal!`,
        });
    }

    // Check if rep reached top 3
    const repRank = rankings.find((r) => r.repId === callData.repId)?.rank;
    if (repRank && repRank <= 3) {
        const previousRank = await getPreviousRank(callData.repId, callData.orgId);
        if (previousRank && previousRank > 3) {
            emitMilestone(callData.orgId, {
                repId: callData.repId,
                repName: callData.repName,
                type: 'top_rank',
                value: repRank,
                message: `🏆 ${callData.repName} just entered the Top 3!`,
            });
        }
    }

    // Check call milestones
    const callCount = await getRepCallCount(callData.repId);
    const milestones = [50, 100, 200, 500, 1000];
    if (milestones.includes(callCount)) {
        emitMilestone(callData.orgId, {
            repId: callData.repId,
            repName: callData.repName,
            type: 'calls_milestone',
            value: callCount,
            message: `🔥 ${callData.repName} hit ${callCount} calls!`,
        });
    }
}

async function getPreviousRank(repId: string, orgId: string): Promise<number | null> {
    return null;
}

async function getRepCallCount(repId: string): Promise<number> {
    const result = query<{ count: number }>(
        `SELECT COUNT(*) as count FROM calls WHERE rep_id = ?`,
        [repId]
    );
    return result[0]?.count || 0;
}

/**
 * Apply missed followup penalty
 */
export async function applyMissedFollowupPenalty(
    repId: string,
    orgId: string
): Promise<void> {
    await updateLeaderboardScore(orgId, repId, -XP_PENALTY_MISSED_FOLLOWUP);

    execute(
        `INSERT INTO rep_xp_history (id, rep_id, xp_delta, reason) VALUES (?, ?, ?, ?)`,
        [generateId(), repId, -XP_PENALTY_MISSED_FOLLOWUP, 'missed_followup']
    );

    const rankings = await getTopRankings(orgId, 10);
    await emitLeaderboardUpdate(orgId, rankings);
}
