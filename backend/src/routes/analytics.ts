import { Router, Request, Response } from 'express';
import { query, pgToSqlite } from '../config/database.js';
import { analyticsService } from '../services/analytics.service.js';
import { authenticate, requireManager } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/analytics/team - Team performance overview
router.get('/dashboard-stats', requireManager, async (req: Request, res: Response) => {
    try {
        const result = analyticsService.getDashboardStats(req.user!.orgId);
        res.json(result);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

router.get('/team', requireManager, async (req: Request, res: Response) => {
    try {
        const { period = '30d' } = req.query;
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

        // Overall stats
        const stats = query<{
            total_calls: string;
            answered_calls: string;
            total_talk_seconds: string;
            conversions: string;
        }>(
            pgToSqlite(`SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE is_answered) as answered_calls,
        COALESCE(SUM(duration_seconds), 0) as total_talk_seconds,
        COUNT(*) FILTER (WHERE disposition = 'converted') as conversions
       FROM calls
       WHERE org_id = $1 AND started_at > NOW() - INTERVAL '${days} days'`),
            [req.user!.orgId]
        );

        // Rep breakdown
        const repStats = query(
            pgToSqlite(`SELECT 
        u.id, u.first_name, u.last_name,
        COUNT(c.id) as total_calls,
        COUNT(c.id) FILTER (WHERE c.is_answered) as answered_calls,
        COALESCE(SUM(c.duration_seconds), 0) as total_talk_seconds,
        COALESCE(AVG(c.duration_seconds) FILTER (WHERE c.is_answered), 0) as avg_call_duration,
        COUNT(c.id) FILTER (WHERE c.disposition = 'converted') as conversions
       FROM users u
       LEFT JOIN calls c ON c.rep_id = u.id AND c.started_at > NOW() - INTERVAL '${days} days'
       WHERE u.org_id = $1 AND u.role = 'rep'
       GROUP BY u.id
       ORDER BY total_calls DESC`),
            [req.user!.orgId]
        );

        // Daily trend
        const dailyTrend = query(
            pgToSqlite(`SELECT 
        DATE(started_at) as date,
        COUNT(*) as calls,
        COUNT(*) FILTER (WHERE is_answered) as answered,
        COALESCE(SUM(duration_seconds), 0) as talk_seconds
       FROM calls
       WHERE org_id = $1 AND started_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(started_at)
       ORDER BY date`),
            [req.user!.orgId]
        );

        res.json({
            overview: {
                totalCalls: parseInt(stats[0]?.total_calls || '0', 10),
                answeredCalls: parseInt(stats[0]?.answered_calls || '0', 10),
                connectivityRate: stats[0]?.total_calls && parseInt(stats[0].total_calls) > 0
                    ? Math.round(parseInt(stats[0].answered_calls) / parseInt(stats[0].total_calls) * 100)
                    : 0,
                totalTalkMinutes: Math.round(parseInt(stats[0]?.total_talk_seconds || '0') / 60),
                conversions: parseInt(stats[0]?.conversions || '0', 10),
            },
            reps: repStats,
            dailyTrend,
            period: days,
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// GET /api/analytics/heatmap - Best time to call heatmap
router.get('/heatmap', requireManager, async (req: Request, res: Response) => {
    try {
        const heatmap = query(
            pgToSqlite(`SELECT 
        EXTRACT(DOW FROM started_at)::int as day_of_week,
        EXTRACT(HOUR FROM started_at)::int as hour_of_day,
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE is_answered) as answered,
        ROUND(COUNT(*) FILTER (WHERE is_answered) * 100.0 / NULLIF(COUNT(*), 0), 2) as pickup_rate
       FROM calls
       WHERE org_id = $1 AND started_at > NOW() - INTERVAL '90 days'
       GROUP BY day_of_week, hour_of_day
       ORDER BY day_of_week, hour_of_day`),
            [req.user!.orgId]
        );

        // Format as 2D grid
        const grid: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
        const attempts: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));

        heatmap.forEach((row: any) => {
            grid[row.day_of_week][row.hour_of_day] = parseFloat(row.pickup_rate || '0');
            attempts[row.day_of_week][row.hour_of_day] = parseInt(row.total_attempts, 10);
        });

        // Find best times
        const bestTimes = heatmap
            .filter((r: any) => parseInt(r.total_attempts) >= 5)
            .sort((a: any, b: any) => parseFloat(b.pickup_rate || '0') - parseFloat(a.pickup_rate || '0'))
            .slice(0, 5);

        res.json({
            grid,
            attempts,
            bestTimes,
            days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            hours: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        });
    } catch (error) {
        console.error('Heatmap error:', error);
        res.status(500).json({ error: 'Failed to fetch heatmap' });
    }
});

// GET /api/analytics/war-room - Real-time war room data
router.get('/war-room', requireManager, async (req: Request, res: Response) => {
    try {
        // Today's stats
        const todayStats = query<{ total_calls: string; conversions: string }>(
            pgToSqlite(`SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE disposition = 'converted') as conversions
       FROM calls
       WHERE org_id = $1 AND DATE(started_at) = CURRENT_DATE`),
            [req.user!.orgId]
        );

        // Recent activity (last 20 calls)
        const recentActivity = query(
            pgToSqlite(`SELECT 
        c.id, c.started_at, c.duration_seconds, c.is_answered, c.disposition,
        u.first_name as rep_first_name, u.last_name as rep_last_name,
        l.first_name as lead_first_name, l.last_name as lead_last_name
       FROM calls c
       JOIN users u ON c.rep_id = u.id
       LEFT JOIN leads l ON c.lead_id = l.id
       WHERE c.org_id = $1
       ORDER BY c.started_at DESC
       LIMIT 20`),
            [req.user!.orgId]
        );

        // Active reps (calls in last 30 min)
        const activeReps = query(
            pgToSqlite(`SELECT DISTINCT u.id, u.first_name, u.last_name
       FROM calls c
       JOIN users u ON c.rep_id = u.id
       WHERE c.org_id = $1 AND c.started_at > NOW() - INTERVAL '30 minutes'`),
            [req.user!.orgId]
        );

        res.json({
            todayCalls: parseInt(todayStats[0]?.total_calls || '0', 10),
            todayConversions: parseInt(todayStats[0]?.conversions || '0', 10),
            recentActivity,
            activeReps,
        });
    } catch (error) {
        console.error('War room error:', error);
        res.status(500).json({ error: 'Failed to fetch war room data' });
    }
});

// GET /api/analytics/rep/:id - Individual rep stats
router.get('/rep/:id', async (req: Request, res: Response) => {
    try {
        // Only allow managers or the rep themselves
        if (req.user!.role === 'rep' && req.user!.id !== req.params.id) {
            res.status(403).json({ error: 'Cannot view other rep stats' });
            return;
        }

        const stats = query(
            pgToSqlite(`SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE is_answered) as answered_calls,
        COALESCE(SUM(duration_seconds), 0) as total_talk_seconds,
        COALESCE(AVG(duration_seconds) FILTER (WHERE is_answered), 0) as avg_call_duration,
        COUNT(*) FILTER (WHERE disposition = 'converted') as conversions,
        COUNT(DISTINCT lead_id) as unique_leads
       FROM calls
       WHERE rep_id = $1 AND started_at > NOW() - INTERVAL '30 days'`),
            [req.params.id]
        );

        // Call to conversion ratio
        const conversionRatio = stats[0]?.total_calls && parseInt(stats[0].total_calls) > 0
            ? (parseInt(stats[0].conversions) / parseInt(stats[0].total_calls) * 100).toFixed(2)
            : '0';

        res.json({
            ...stats[0],
            conversionRatio,
        });
    } catch (error) {
        console.error('Rep stats error:', error);
        res.status(500).json({ error: 'Failed to fetch rep stats' });
    }
});



// GET /api/analytics/fake-reporting
router.get('/fake-reporting', requireManager, async (req: Request, res: Response) => {
    try {
        const suspicious = query(
            pgToSqlite(`SELECT 
                u.id, u.first_name, u.last_name,
                COUNT(*) as suspicious_calls
            FROM calls c
            JOIN users u ON c.rep_id = u.id
            WHERE c.org_id = $1 
              AND c.duration_seconds < 5 
              AND c.call_type = 'outbound'
              AND c.started_at > NOW() - INTERVAL '7 days'
            GROUP BY u.id
            HAVING COUNT(*) > 5
            ORDER BY suspicious_calls DESC`),
            [req.user!.orgId]
        );

        res.json({ suspicious });
    } catch (error) {
        console.error('Fake reporting check error:', error);
        res.status(500).json({ error: 'Failed to fetch fake reporting data' });
    }
});

// GET /api/analytics/my-stats - Personal dashboard stats for salesperson
router.get('/my-stats', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const orgId = req.user!.orgId;
        const today = new Date().toISOString().split('T')[0];

        // Today's call stats
        const todayStats = query<{
            total_calls: string;
            answered_calls: string;
            total_talk_seconds: string;
            conversions: string;
        }>(
            pgToSqlite(`SELECT 
                COUNT(*) as total_calls,
                SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) as answered_calls,
                COALESCE(SUM(duration_seconds), 0) as total_talk_seconds,
                SUM(CASE WHEN disposition = 'converted' THEN 1 ELSE 0 END) as conversions
            FROM calls
            WHERE rep_id = $1 AND DATE(started_at) = $2`),
            [userId, today]
        );

        // This week's stats
        const weekStats = query<{
            total_calls: string;
            conversions: string;
        }>(
            pgToSqlite(`SELECT 
                COUNT(*) as total_calls,
                SUM(CASE WHEN disposition = 'converted' THEN 1 ELSE 0 END) as conversions
            FROM calls
            WHERE rep_id = $1 AND started_at >= date('now', '-7 days')`),
            [userId]
        );

        // Assigned leads by status
        const leadStats = query<{ status: string; count: string }>(
            pgToSqlite(`SELECT status, COUNT(*) as count
            FROM leads
            WHERE assigned_to = $1 AND org_id = $2
            GROUP BY status`),
            [userId, orgId]
        );

        // Today's pending followups
        const followupCount = query<{ count: string }>(
            pgToSqlite(`SELECT COUNT(*) as count
            FROM followups
            WHERE rep_id = $1 AND is_completed = 0 AND DATE(due_date) <= $2`),
            [userId, today]
        );

        // Recent calls (last 5)
        const recentCalls = query(
            pgToSqlite(`SELECT c.id, c.started_at, c.duration_seconds, c.is_answered, c.disposition,
                l.first_name as lead_first_name, l.last_name as lead_last_name, l.phone as lead_phone
            FROM calls c
            LEFT JOIN leads l ON c.lead_id = l.id
            WHERE c.rep_id = $1
            ORDER BY c.started_at DESC
            LIMIT 5`),
            [userId]
        );

        // Leaderboard position (XP based)
        const xpRank = query<{ rep_id: string; total_xp: string }>(
            pgToSqlite(`SELECT rep_id, COALESCE(SUM(xp_delta), 0) as total_xp
            FROM rep_xp_history
            WHERE rep_id IN (SELECT id FROM users WHERE org_id = $1)
            GROUP BY rep_id
            ORDER BY total_xp DESC`),
            [orgId]
        );

        const myXp = xpRank.find((r: any) => r.rep_id === userId);
        const myRank = xpRank.findIndex((r: any) => r.rep_id === userId) + 1;

        res.json({
            today: {
                calls: parseInt(todayStats[0]?.total_calls || '0', 10),
                answered: parseInt(todayStats[0]?.answered_calls || '0', 10),
                talkTimeMinutes: Math.round(parseInt(todayStats[0]?.total_talk_seconds || '0') / 60),
                conversions: parseInt(todayStats[0]?.conversions || '0', 10),
            },
            week: {
                calls: parseInt(weekStats[0]?.total_calls || '0', 10),
                conversions: parseInt(weekStats[0]?.conversions || '0', 10),
            },
            leads: {
                byStatus: leadStats.reduce((acc: any, curr: any) => {
                    acc[curr.status] = parseInt(curr.count, 10);
                    return acc;
                }, {}),
                total: leadStats.reduce((sum: number, curr: any) => sum + parseInt(curr.count, 10), 0),
            },
            followups: {
                pending: parseInt(followupCount[0]?.count || '0', 10),
            },
            recentCalls,
            leaderboard: {
                rank: myRank || 0,
                totalReps: xpRank.length,
                xp: parseInt(myXp?.total_xp || '0', 10),
            },
        });
    } catch (error) {
        console.error('My stats error:', error);
        res.status(500).json({ error: 'Failed to fetch personal stats' });
    }
});

// GET /api/analytics/my-performance - Detailed personal performance for salesperson
router.get('/my-performance', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { period = '7d' } = req.query;
        const days = period === '30d' ? 30 : period === 'today' ? 1 : 7;

        // Daily breakdown
        const dailyStats = query(
            pgToSqlite(`SELECT 
                DATE(started_at) as date,
                COUNT(*) as calls,
                SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) as answered,
                COALESCE(SUM(duration_seconds), 0) as talk_seconds,
                SUM(CASE WHEN disposition = 'converted' THEN 1 ELSE 0 END) as conversions
            FROM calls
            WHERE rep_id = $1 AND started_at >= date('now', '-${days} days')
            GROUP BY DATE(started_at)
            ORDER BY date`),
            [userId]
        );

        // Hourly distribution for best time analysis
        const hourlyStats = query(
            pgToSqlite(`SELECT 
                CAST(strftime('%H', started_at) AS INTEGER) as hour,
                COUNT(*) as calls,
                SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) as answered,
                ROUND(SUM(CASE WHEN is_answered = 1 THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 1) as connect_rate
            FROM calls
            WHERE rep_id = $1 AND started_at >= date('now', '-30 days')
            GROUP BY hour
            ORDER BY hour`),
            [userId]
        );

        // Disposition breakdown
        const dispositions = query(
            pgToSqlite(`SELECT 
                COALESCE(disposition, 'unknown') as disposition,
                COUNT(*) as count
            FROM calls
            WHERE rep_id = $1 AND started_at >= date('now', '-${days} days')
            GROUP BY disposition
            ORDER BY count DESC`),
            [userId]
        );

        // XP history
        const xpHistory = query(
            pgToSqlite(`SELECT 
                DATE(created_at) as date,
                SUM(xp_delta) as xp,
                GROUP_CONCAT(reason) as reasons
            FROM rep_xp_history
            WHERE rep_id = $1 AND created_at >= date('now', '-${days} days')
            GROUP BY DATE(created_at)
            ORDER BY date`),
            [userId]
        );

        // Total XP
        const totalXp = query<{ total: string }>(
            pgToSqlite('SELECT COALESCE(SUM(xp_delta), 0) as total FROM rep_xp_history WHERE rep_id = $1'),
            [userId]
        );

        // Team comparison (percentile)
        const teamAvg = query<{
            avg_calls: string;
            avg_talk_time: string;
            avg_conversions: string;
        }>(
            pgToSqlite(`SELECT 
                AVG(call_count) as avg_calls,
                AVG(talk_time) as avg_talk_time,
                AVG(conv_count) as avg_conversions
            FROM (
                SELECT 
                    rep_id,
                    COUNT(*) as call_count,
                    SUM(duration_seconds) as talk_time,
                    SUM(CASE WHEN disposition = 'converted' THEN 1 ELSE 0 END) as conv_count
                FROM calls
                WHERE org_id = $1 AND started_at >= date('now', '-${days} days')
                GROUP BY rep_id
            )`),
            [req.user!.orgId]
        );

        // Personal totals for comparison
        const myTotals = query<{
            calls: string;
            talk_time: string;
            conversions: string;
        }>(
            pgToSqlite(`SELECT 
                COUNT(*) as calls,
                COALESCE(SUM(duration_seconds), 0) as talk_time,
                SUM(CASE WHEN disposition = 'converted' THEN 1 ELSE 0 END) as conversions
            FROM calls
            WHERE rep_id = $1 AND started_at >= date('now', '-${days} days')`),
            [userId]
        );

        res.json({
            period: days,
            dailyStats,
            hourlyStats,
            dispositions,
            xpHistory,
            totalXp: parseInt(totalXp[0]?.total || '0', 10),
            comparison: {
                teamAvgCalls: Math.round(parseFloat(teamAvg[0]?.avg_calls || '0')),
                teamAvgTalkTime: Math.round(parseFloat(teamAvg[0]?.avg_talk_time || '0') / 60),
                teamAvgConversions: Math.round(parseFloat(teamAvg[0]?.avg_conversions || '0')),
                myCalls: parseInt(myTotals[0]?.calls || '0', 10),
                myTalkTime: Math.round(parseInt(myTotals[0]?.talk_time || '0') / 60),
                myConversions: parseInt(myTotals[0]?.conversions || '0', 10),
            },
        });
    } catch (error) {
        console.error('My performance error:', error);
        res.status(500).json({ error: 'Failed to fetch personal performance' });
    }
});

export default router;
