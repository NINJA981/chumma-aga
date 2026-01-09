import { Request, Response, NextFunction } from 'express';
import { updateLeaderboardScore, getTopRankings } from '../config/redis.js';
import { emitLeaderboardUpdate, emitCallActivity, emitMilestone } from '../config/socket.js';
import { query, execute, generateId } from '../config/database.js';

// --- Scoring Configuration ---
export const ScoringConfig = {
    CALL: 10,
    TALK_MINUTE: 5,
    CONVERSION: 100,
    MISSED_FOLLOWUP_PENALTY: 50,

    // New Bonuses
    QUALITY_CALL_THRESHOLD_SECONDS: 300, // 5 minutes
    QUALITY_CALL_BONUS: 20,

    SPEED_TO_LEAD_THRESHOLD_SECONDS: 300, // 5 minutes from lead creation
    SPEED_TO_LEAD_BONUS: 10,

    STREAK_DAILY_BONUS: 50, // Bonus for maintaining a streak
};

export interface CallData {
    repId: string;
    orgId: string;
    repName: string;
    durationSeconds: number;
    isAnswered: boolean;
    disposition?: string;
    leadName?: string;
    leadCreatedAt?: Date; // Added for Speed to Lead bonus
}

export interface XPCalculationResult {
    totalXp: number;
    breakdown: { reason: string; points: number }[];
}

/**
 * Calculate XP from call data with detailed breakdown
 */
export function calculateCallXP(data: CallData): XPCalculationResult {
    const breakdown: { reason: string; points: number }[] = [];
    let totalXp = 0;

    // 1. Base Call XP
    breakdown.push({ reason: 'Call Attempt', points: ScoringConfig.CALL });
    totalXp += ScoringConfig.CALL;

    // 2. Talk Time (if answered)
    if (data.isAnswered && data.durationSeconds > 0) {
        const talkMinutes = Math.ceil(data.durationSeconds / 60);
        const points = talkMinutes * ScoringConfig.TALK_MINUTE;
        breakdown.push({ reason: `Talk Time (${talkMinutes}m)`, points });
        totalXp += points;

        // 3. Quality Bonus (Long call)
        if (data.durationSeconds >= ScoringConfig.QUALITY_CALL_THRESHOLD_SECONDS) {
            breakdown.push({ reason: 'Quality Conversation Bonus', points: ScoringConfig.QUALITY_CALL_BONUS });
            totalXp += ScoringConfig.QUALITY_CALL_BONUS;
        }
    }

    // 4. Conversion
    if (data.disposition === 'converted') {
        breakdown.push({ reason: 'Conversion', points: ScoringConfig.CONVERSION });
        totalXp += ScoringConfig.CONVERSION;
    }

    // 5. Speed to Lead
    if (data.leadCreatedAt) {
        const now = new Date();
        const leadCreated = new Date(data.leadCreatedAt);
        const diffSeconds = (now.getTime() - leadCreated.getTime()) / 1000;

        if (diffSeconds <= ScoringConfig.SPEED_TO_LEAD_THRESHOLD_SECONDS && diffSeconds >= 0) {
            breakdown.push({ reason: 'Speed to Lead Bonus', points: ScoringConfig.SPEED_TO_LEAD_BONUS });
            totalXp += ScoringConfig.SPEED_TO_LEAD_BONUS;
        }
    }

    return { totalXp, breakdown };
}

/**
 * Middleware to update leaderboard after call is saved
 */
export async function updateLeaderboardMiddleware(
    callData: CallData
): Promise<void> {
    const { totalXp, breakdown } = calculateCallXP(callData);

    // Update in-memory leaderboard
    const newScore = await updateLeaderboardScore(callData.orgId, callData.repId, totalXp);

    // Record XP history with detailed breakdown
    // We'll log the primary reason as 'call' but could expand the DB schema to store the JSON breakdown later
    // For now, we insert one row per significant event or just the total.
    // Let's insert the total for now to keep it simple, or iterate if we want granular history.
    // Iterating is better for "Why did I get this score?"

    try {
        const historyId = generateId();
        // Insert main entry
        execute(
            `INSERT INTO rep_xp_history (id, rep_id, xp_delta, reason) VALUES (?, ?, ?, ?)`,
            [historyId, callData.repId, totalXp, 'call_activity']
        );

        // Use the breakdown for Milestones or UI toasts if needed
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
        xpEarned: totalXp, // Useful for UI to show "+50 XP" bubble
    });

    // Check for milestones & streaks
    await checkMilestones(callData, newScore, rankings, breakdown);
}

/**
 * Check and emit milestones
 */
async function checkMilestones(
    callData: CallData,
    newScore: number,
    rankings: { repId: string; xp: number; rank: number }[],
    breakdown: { reason: string; points: number }[]
): Promise<void> {

    // emit specific breakdown milestones (e.g. "Speed to Lead!")
    const speedBonus = breakdown.find(b => b.reason === 'Speed to Lead Bonus');
    if (speedBonus) {
        emitMilestone(callData.orgId, {
            repId: callData.repId,
            repName: callData.repName,
            type: 'speed_bonus',
            value: speedBonus.points,
            message: `⚡ ${callData.repName} is lightning fast! (Speed to Lead)`,
        });
    }

    const qualityBonus = breakdown.find(b => b.reason === 'Quality Conversation Bonus');
    if (qualityBonus) {
        emitMilestone(callData.orgId, {
            repId: callData.repId,
            repName: callData.repName,
            type: 'quality_bonus',
            value: qualityBonus.points,
            message: `🗣️ ${callData.repName} is having a great conversation! (>5m)`,
        });
    }

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
        // Simple check (in real app, compare with cached previous rank)
        emitMilestone(callData.orgId, {
            repId: callData.repId,
            repName: callData.repName,
            type: 'top_rank',
            value: repRank,
            message: `🏆 ${callData.repName} is now #${repRank} on the leaderboard!`,
        });
    }
}

/**
 * Apply missed followup penalty
 */
export async function applyMissedFollowupPenalty(
    repId: string,
    orgId: string
): Promise<void> {
    await updateLeaderboardScore(orgId, repId, -ScoringConfig.MISSED_FOLLOWUP_PENALTY);

    execute(
        `INSERT INTO rep_xp_history (id, rep_id, xp_delta, reason) VALUES (?, ?, ?, ?)`,
        [generateId(), repId, -ScoringConfig.MISSED_FOLLOWUP_PENALTY, 'missed_followup']
    );

    const rankings = await getTopRankings(orgId, 10);
    await emitLeaderboardUpdate(orgId, rankings);
}
