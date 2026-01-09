/**
 * Leaderboard Service - Leaderboard and gamification business logic
 */

import { getTopRankings, getRepScore, getRepRank } from '../config/redis.js';
import { query, queryOne, pgToSqlite } from '../repositories/index.js';
import { callRepository } from '../repositories/call.repository.js';
import { getAIPredictiveCoaching } from './ai/coaching.js';
import type { LeaderboardEntry, RepLeaderboardStats } from '../types/index.js';
import type { RepStats } from '../types/index.js';

export class LeaderboardService {
    /**
     * Get top rankings for an organization
     */
    async getTopRankings(orgId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
        const rankings = await getTopRankings(orgId, limit);

        if (!rankings || rankings.length === 0) {
            return [];
        }

        // Enrich with user data
        const repIds = rankings.map((r: { repId: string }) => r.repId);
        const placeholders = repIds.map(() => '?').join(',');

        const users = query<{
            id: string;
            first_name: string;
            last_name: string;
            avatar_url: string;
        }>(
            `SELECT id, first_name, last_name, avatar_url FROM users WHERE id IN (${placeholders})`,
            repIds
        );

        const userMap = new Map(users.map(u => [u.id, u]));

        return rankings.map((r: { repId: string; xp: number }, index: number) => {
            const user = userMap.get(r.repId);
            return {
                repId: r.repId,
                firstName: user?.first_name || 'Unknown',
                lastName: user?.last_name || '',
                avatarUrl: user?.avatar_url,
                xp: r.xp || 0,
                rank: index + 1,
            };
        });
    }

    /**
     * Get individual rep stats with AI coaching
     */
    async getRepStats(repId: string, orgId: string): Promise<RepLeaderboardStats> {
        // Get current score and rank from Redis
        const [score, rank] = await Promise.all([
            getRepScore(orgId, repId),
            getRepRank(orgId, repId),
        ]);

        // Get detailed stats from database
        const stats = callRepository.getRepStats(repId, 30);

        // Get user info
        const user = queryOne<{
            first_name: string;
            last_name: string;
            avatar_url: string;
        }>(
            'SELECT first_name, last_name, avatar_url FROM users WHERE id = ?',
            [repId]
        );

        // Check if rep is in "middle of pack" (ranks 4-7) for AI coaching
        let aiCoachingTip: string | null = null;
        if (rank && rank >= 4 && rank <= 7 && stats) {
            try {
                aiCoachingTip = await getAIPredictiveCoaching({
                    repName: `${user?.first_name} ${user?.last_name}`,
                    totalCalls: stats.total_calls,
                    answeredCalls: stats.answered_calls,
                    talkMinutes: Math.round(stats.total_talk_seconds / 60),
                    conversions: stats.conversions,
                });
            } catch (e) {
                console.error('AI coaching error:', e);
            }
        }

        // Calculate call to conversion ratio
        const conversionRatio = stats?.total_calls && stats.total_calls > 0
            ? (stats.conversions / stats.total_calls * 100).toFixed(2)
            : '0';

        return {
            repId,
            firstName: user?.first_name,
            lastName: user?.last_name,
            avatarUrl: user?.avatar_url,
            xp: score || 0,
            rank: rank || null,
            totalCalls: stats?.total_calls || 0,
            answeredCalls: stats?.answered_calls || 0,
            talkMinutes: Math.round((stats?.total_talk_seconds || 0) / 60),
            conversions: stats?.conversions || 0,
            conversionRatio: parseFloat(conversionRatio),
            aiCoachingTip,
        };
    }

    /**
     * Get leaderboard history
     */
    getHistory(orgId: string, days: number = 7) {
        return query(
            pgToSqlite(`SELECT snapshot_date, rankings
             FROM leaderboard_snapshots
             WHERE org_id = ? AND snapshot_date > date('now', '-${days} days')
             ORDER BY snapshot_date`),
            [orgId]
        );
    }
}

// Singleton instance
export const leaderboardService = new LeaderboardService();
