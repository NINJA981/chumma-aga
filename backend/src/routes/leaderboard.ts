import { Router, Request, Response } from 'express';
import { query, queryOne, pgToSqlite } from '../config/database.js';
import { getTopRankings, getRepScore, getRepRank } from '../config/redis.js';
import { authenticate, requireManager } from '../middleware/auth.js';
import { getAIPredictiveCoaching } from '../services/ai/coaching.js';

const router = Router();
router.use(authenticate);

// GET /api/leaderboard/top - Get top rankings
router.get('/top', async (req: Request, res: Response) => {
    try {
        const { limit = 10 } = req.query;
        const rankings = await getTopRankings(req.user!.orgId, Number(limit));

        // Enrich with user data
        if (rankings.length > 0) {
            const repIds = rankings.map((r: { repId: string }) => r.repId);

            // SQLite doesn't support = ANY($1), need to use IN (?, ?, ?) expansion
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

            const enrichedRankings = rankings.map((r: { repId: string }) => {
                const user = userMap.get(r.repId);
                return {
                    ...r,
                    firstName: user?.first_name || 'Unknown',
                    lastName: user?.last_name || '',
                    avatarUrl: user?.avatar_url,
                };
            });

            res.json({ rankings: enrichedRankings });
            return;
        }

        res.json({ rankings: [] });
    } catch (error) {
        console.error('Leaderboard top error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /api/leaderboard/rep/:id - Get individual rep stats with AI coaching
router.get('/rep/:id', async (req: Request, res: Response) => {
    try {
        const repId = req.params.id;
        const orgId = req.user!.orgId;

        // Get current score and rank
        const [score, rank] = await Promise.all([
            getRepScore(orgId, repId),
            getRepRank(orgId, repId),
        ]);

        // Get detailed stats
        const stats = queryOne(
            pgToSqlite(`SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE is_answered) as answered_calls,
        COALESCE(SUM(duration_seconds), 0) as total_talk_seconds,
        COUNT(*) FILTER (WHERE disposition = 'converted') as conversions
       FROM calls
       WHERE rep_id = $1 AND started_at > NOW() - INTERVAL '30 days'`),
            [repId]
        );

        // Get user info
        const user = queryOne<{
            first_name: string;
            last_name: string;
            avatar_url: string;
        }>(
            pgToSqlite('SELECT first_name, last_name, avatar_url FROM users WHERE id = $1'),
            [repId]
        );

        // Check if rep is in "middle of pack" (ranks 4-7) for AI coaching
        let aiCoachingTip: string | null = null;
        if (rank && rank >= 4 && rank <= 7) {
            try {
                aiCoachingTip = await getAIPredictiveCoaching({
                    repName: `${user?.first_name} ${user?.last_name}`,
                    totalCalls: parseInt(stats?.total_calls || '0', 10),
                    answeredCalls: parseInt(stats?.answered_calls || '0', 10),
                    talkMinutes: Math.round(parseInt(stats?.total_talk_seconds || '0') / 60),
                    conversions: parseInt(stats?.conversions || '0', 10),
                });
            } catch (e) {
                console.error('AI coaching error:', e);
            }
        }

        // Calculate call to conversion ratio
        const conversionRatio = stats?.total_calls && parseInt(stats.total_calls) > 0
            ? (parseInt(stats.conversions) / parseInt(stats.total_calls) * 100).toFixed(2)
            : '0';

        res.json({
            repId,
            firstName: user?.first_name,
            lastName: user?.last_name,
            avatarUrl: user?.avatar_url,
            xp: score || 0,
            rank: rank || null,
            totalCalls: parseInt(stats?.total_calls || '0', 10),
            answeredCalls: parseInt(stats?.answered_calls || '0', 10),
            talkMinutes: Math.round(parseInt(stats?.total_talk_seconds || '0') / 60),
            conversions: parseInt(stats?.conversions || '0', 10),
            conversionRatio: parseFloat(conversionRatio),
            aiCoachingTip,
        });
    } catch (error) {
        console.error('Rep leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch rep stats' });
    }
});

// GET /api/leaderboard/history - Historical ranking trends
router.get('/history', requireManager, async (req: Request, res: Response) => {
    try {
        const { days = 7 } = req.query;

        const history = query(
            pgToSqlite(`SELECT snapshot_date, rankings
       FROM leaderboard_snapshots
       WHERE org_id = $1 AND snapshot_date > CURRENT_DATE - INTERVAL '${Number(days)} days'
       ORDER BY snapshot_date`),
            [req.user!.orgId]
        );

        res.json({ history });
    } catch (error) {
        console.error('Leaderboard history error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

export default router;
