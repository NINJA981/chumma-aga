
import { query } from '../config/database.js';
import { setLeaderboardScore, getTopRankings as redisGetTop, getRepRank, getRepScore } from '../config/redis.js';

export const leaderboardService = {
    /**
     * Sync leaderboard data from SQLite to in-memory store
     * This ensures the leaderboard is populated on server restart
     */
    async syncFromDB() {
        console.log('🔄 Syncing leaderboard from database...');
        try {
            // Get total XP for all reps
            const repScores = query<{ rep_id: string; total_xp: string; org_id: string }>(
                `SELECT 
                    r.rep_id, 
                    COALESCE(SUM(r.xp_delta), 0) as total_xp,
                    u.org_id
                 FROM rep_xp_history r
                 JOIN users u ON r.rep_id = u.id
                 GROUP BY r.rep_id`
            );

            console.log(`Found ${repScores.length} reps with XP history`);

            // Update in-memory store
            for (const score of repScores) {
                await setLeaderboardScore(
                    score.org_id,
                    score.rep_id,
                    parseInt(score.total_xp, 10)
                );
            }

            console.log('✅ Leaderboard sync complete');
        } catch (error) {
            console.error('❌ Failed to sync leaderboard:', error);
        }
    },

    async getTopRankings(orgId: string, limit: number) {
        return redisGetTop(orgId, limit);
    },

    async getRepStats(repId: string, orgId: string) {
        const rank = await getRepRank(orgId, repId);
        const score = await getRepScore(orgId, repId);
        return { rank, score: score || 0 };
    },

    async getHistory(orgId: string, days: number) {
        try {
            // Fetch history from snapshots (if available) or compute from xp_history
            // For now, return snapshots
            return query(
                `SELECT * FROM leaderboard_snapshots 
                 WHERE org_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [orgId, days]
            );
        } catch (error) {
            console.error('Failed to get history:', error);
            return [];
        }
    }
};
