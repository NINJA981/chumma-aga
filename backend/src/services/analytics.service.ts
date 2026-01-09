/**
 * Analytics Service - Analytics computation business logic
 */

import { callRepository } from '../repositories/call.repository.js';
import { query, pgToSqlite } from '../repositories/index.js';
import type { TeamAnalytics, HeatmapData, WarRoomData } from '../types/index.js';

export class AnalyticsService {
    /**
     * Get team performance analytics
     */
    getTeamAnalytics(orgId: string, period: '7d' | '30d' | '90d' = '30d'): TeamAnalytics {
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
                SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) as answered_calls,
                COALESCE(SUM(duration_seconds), 0) as total_talk_seconds,
                SUM(CASE WHEN disposition = 'converted' THEN 1 ELSE 0 END) as conversions
             FROM calls
             WHERE org_id = ? AND started_at > datetime('now', '-${days} days')`),
            [orgId]
        );

        // Rep stats
        const repStats = query<{
            id: string;
            first_name: string;
            last_name: string;
            total_calls: string;
            answered_calls: string;
            total_talk_seconds: string;
            conversions: string;
            avg_duration: string;
        }>(
            pgToSqlite(`SELECT 
                u.id, u.first_name, u.last_name,
                COUNT(c.id) as total_calls,
                SUM(CASE WHEN c.is_answered = 1 THEN 1 ELSE 0 END) as answered_calls,
                COALESCE(SUM(c.duration_seconds), 0) as total_talk_seconds,
                SUM(CASE WHEN c.disposition = 'converted' THEN 1 ELSE 0 END) as conversions,
                COALESCE(AVG(CASE WHEN c.is_answered = 1 THEN c.duration_seconds ELSE NULL END), 0) as avg_duration
             FROM users u
             LEFT JOIN calls c ON c.rep_id = u.id AND c.started_at > datetime('now', '-${days} days')
             WHERE u.org_id = ? AND u.role = 'rep'
             GROUP BY u.id
             ORDER BY total_calls DESC`),
            [orgId]
        );

        // Daily trend
        const dailyTrend = query<{
            date: string;
            calls: string;
            answered: string;
            conversions: string;
        }>(
            pgToSqlite(`SELECT 
                DATE(started_at) as date,
                COUNT(*) as calls,
                SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) as answered,
                SUM(CASE WHEN disposition = 'converted' THEN 1 ELSE 0 END) as conversions
             FROM calls
             WHERE org_id = ? AND started_at > datetime('now', '-${days} days')
             GROUP BY date
             ORDER BY date`),
            [orgId]
        );

        const totalCalls = parseInt(stats[0]?.total_calls || '0', 10);
        const answeredCalls = parseInt(stats[0]?.answered_calls || '0', 10);

        return {
            summary: {
                totalCalls,
                answeredCalls,
                totalTalkSeconds: parseInt(stats[0]?.total_talk_seconds || '0', 10),
                conversions: parseInt(stats[0]?.conversions || '0', 10),
                connectRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
            },
            reps: repStats.map(rep => ({
                id: rep.id,
                firstName: rep.first_name,
                lastName: rep.last_name,
                totalCalls: parseInt(rep.total_calls || '0', 10),
                answeredCalls: parseInt(rep.answered_calls || '0', 10),
                totalTalkSeconds: parseInt(rep.total_talk_seconds || '0', 10),
                conversions: parseInt(rep.conversions || '0', 10),
                avgDuration: parseFloat(rep.avg_duration || '0'),
            })),
            dailyTrend: dailyTrend.map(day => ({
                date: day.date,
                calls: parseInt(day.calls || '0', 10),
                answered: parseInt(day.answered || '0', 10),
                conversions: parseInt(day.conversions || '0', 10),
            })),
            period: days,
        };
    }

    /**
     * Get call heatmap data
     */
    getHeatmap(orgId: string): HeatmapData {
        const heatmapData = callRepository.getHeatmapData(orgId, 90);

        // Format as 2D grid
        const grid: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
        const attempts: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
        const bestTimes: { day: number; hour: number; rate: number }[] = [];

        for (const row of heatmapData) {
            if (row.day_of_week >= 0 && row.day_of_week < 7 && row.hour_of_day >= 0 && row.hour_of_day < 24) {
                grid[row.day_of_week][row.hour_of_day] = row.pickup_rate;
                attempts[row.day_of_week][row.hour_of_day] = row.total_attempts;

                if (row.pickup_rate > 50 && row.total_attempts >= 5) {
                    bestTimes.push({
                        day: row.day_of_week,
                        hour: row.hour_of_day,
                        rate: row.pickup_rate,
                    });
                }
            }
        }

        // Sort best times by rate
        bestTimes.sort((a, b) => b.rate - a.rate);

        return {
            grid,
            attempts,
            bestTimes: bestTimes.slice(0, 5),
            days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            hours: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        };
    }

    /**
     * Get war room real-time data
     */
    getWarRoomData(orgId: string): WarRoomData {
        const todayStats = callRepository.getTodayStats(orgId);
        const recentActivity = callRepository.getRecentActivity(orgId, 10);

        // Get active reps (calls in last 30 min)
        const activeReps = query<{ id: string; first_name: string; last_name: string }>(
            pgToSqlite(`SELECT DISTINCT u.id, u.first_name, u.last_name
             FROM calls c
             JOIN users u ON c.rep_id = u.id
             WHERE c.org_id = ? AND c.started_at > datetime('now', '-30 minutes')`),
            [orgId]
        );

        return {
            todayCalls: todayStats.total_calls,
            todayConversions: todayStats.conversions,
            recentActivity: recentActivity.map(activity => ({
                id: activity.id,
                repName: `${activity.rep_first_name} ${activity.rep_last_name}`,
                leadName: activity.lead_first_name
                    ? `${activity.lead_first_name} ${activity.lead_last_name || ''}`.trim()
                    : 'Unknown',
                disposition: activity.disposition || 'in_progress',
                duration: activity.duration_seconds,
                time: activity.started_at,
            })),
            activeReps: activeReps.map(rep => ({
                id: rep.id,
                firstName: rep.first_name,
                lastName: rep.last_name,
            })),
        };
    }

    /**
     * Get individual rep analytics
     */
    getRepAnalytics(repId: string, orgId: string, period: '7d' | '30d' | '90d' = '30d') {
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

        const stats = callRepository.getRepStats(repId, days);
        if (!stats) {
            return null;
        }

        const conversionRatio = stats.total_calls > 0
            ? (stats.conversions / stats.total_calls * 100).toFixed(2)
            : '0';

        return {
            totalCalls: stats.total_calls,
            answeredCalls: stats.answered_calls,
            totalTalkMinutes: Math.round(stats.total_talk_seconds / 60),
            conversions: stats.conversions,
            conversionRatio: parseFloat(conversionRatio),
            connectRate: stats.total_calls > 0
                ? Math.round((stats.answered_calls / stats.total_calls) * 100)
                : 0,
        };
    }

    /**
     * Get dashboard stats for manager (Morning Huddle)
     */
    getDashboardStats(orgId: string): any {
        // Daily stats for Team Energy
        const dailyStats = query<{
            total_talk_seconds: string;
            total_calls: string;
            answered_calls: string;
        }>(
            pgToSqlite(`SELECT 
                COALESCE(SUM(duration_seconds), 0) as total_talk_seconds,
                COUNT(*) as total_calls,
                SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) as answered_calls
             FROM calls
             WHERE org_id = ? AND started_at > datetime('now', 'start of day')`),
            [orgId]
        );

        // Revenue Leakage (Missed calls from leads who haven't been called back)
        // Logic: Missed calls where NO successful outgoing call happened afterwards to the same number
        const leakageStats = query<{
            missed_calls: string;
        }>(
            pgToSqlite(`SELECT COUNT(*) as missed_calls
             FROM calls c
             WHERE c.org_id = ? 
             AND c.is_answered = 0 
             AND c.direction = 'incoming'
             AND c.started_at > datetime('now', 'start of day')
             AND NOT EXISTS (
                SELECT 1 FROM calls c2 
                WHERE c2.to_number = c.from_number 
                AND c2.started_at > c.started_at 
                AND c2.is_answered = 1
             )`),
            [orgId]
        );

        // Active Agents (simulated from recent activity)
        const activeAgents = query<{
            id: string;
            first_name: string;
            last_name: string;
            status: string;
        }>(
            pgToSqlite(`SELECT DISTINCT u.id, u.first_name, u.last_name, 'On Call' as status
             FROM calls c
             JOIN users u ON c.rep_id = u.id
             WHERE c.org_id = ? AND c.status = 'in-progress'`),
            [orgId]
        );

        const totalTalkSeconds = parseInt(dailyStats[0]?.total_talk_seconds || '0', 10);
        const hours = Math.floor(totalTalkSeconds / 3600);
        const minutes = Math.floor((totalTalkSeconds % 3600) / 60);

        const missedCount = parseInt(leakageStats[0]?.missed_calls || '0', 10);

        return {
            teamEnergy: {
                totalTalkTime: `${hours}h ${minutes}m`,
                trend: '+12%', // Todo: Calculate vs yesterday
                status: totalTalkSeconds > 3600 ? 'High Energy' : 'Warming Up'
            },
            revenueLeakage: {
                missedCalls: missedCount,
                potentialLoss: `₹${(missedCount * 2500).toLocaleString()}`, // Assume 2.5k per lead value
                details: `${missedCount} High-value leads missed this morning.`
            },
            activeAgents: activeAgents.map(a => ({
                name: `${a.first_name} ${a.last_name}`,
                status: a.status,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.first_name}`
            }))
        };
    }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
