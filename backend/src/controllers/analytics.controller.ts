/**
 * Analytics Controller - HTTP handlers for analytics
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analytics.service.js';
import { asyncHandler } from '../errors/handler.js';
import { ForbiddenError } from '../errors/index.js';

const periodSchema = z.object({
    period: z.enum(['7d', '30d', '90d']).default('30d'),
});

export class AnalyticsController {
    /**
     * GET /api/analytics/team
     */
    getTeam = asyncHandler(async (req: Request, res: Response) => {
        const { period } = periodSchema.parse(req.query);
        const result = analyticsService.getTeamAnalytics(req.user!.orgId, period);
        res.json(result);
    });

    /**
     * GET /api/analytics/heatmap
     */
    getHeatmap = asyncHandler(async (req: Request, res: Response) => {
        const result = analyticsService.getHeatmap(req.user!.orgId);
        res.json(result);
    });

    /**
     * GET /api/analytics/war-room
     */
    getWarRoom = asyncHandler(async (req: Request, res: Response) => {
        const result = analyticsService.getWarRoomData(req.user!.orgId);
        res.json(result);
    });

    /**
     * GET /api/analytics/rep/:id
     */
    getRepAnalytics = asyncHandler(async (req: Request, res: Response) => {
        const repId = req.params.id;

        // Only allow managers or the rep themselves
        if (req.user!.role === 'rep' && req.user!.id !== repId) {
            throw new ForbiddenError('Cannot view other rep stats');
        }

        const { period } = periodSchema.parse(req.query);
        const result = analyticsService.getRepAnalytics(repId, req.user!.orgId, period);
        res.json(result);
    });

    /**
     * GET /api/analytics/dashboard-stats
     */
    getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
        const result = analyticsService.getDashboardStats(req.user!.orgId);
        res.json(result);
    });
}

// Singleton instance
export const analyticsController = new AnalyticsController();
