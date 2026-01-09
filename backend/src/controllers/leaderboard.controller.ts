/**
 * Leaderboard Controller - HTTP handlers for leaderboard
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { leaderboardService } from '../services/leaderboard.service.js';
import { asyncHandler } from '../errors/handler.js';

const limitSchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(10),
});

const daysSchema = z.object({
    days: z.coerce.number().min(1).max(90).default(7),
});

export class LeaderboardController {
    /**
     * GET /api/leaderboard/top
     */
    getTop = asyncHandler(async (req: Request, res: Response) => {
        const { limit } = limitSchema.parse(req.query);
        const rankings = await leaderboardService.getTopRankings(req.user!.orgId, limit);
        res.json({ rankings });
    });

    /**
     * GET /api/leaderboard/rep/:id
     */
    getRepStats = asyncHandler(async (req: Request, res: Response) => {
        const result = await leaderboardService.getRepStats(req.params.id, req.user!.orgId);
        res.json(result);
    });

    /**
     * GET /api/leaderboard/history
     */
    getHistory = asyncHandler(async (req: Request, res: Response) => {
        const { days } = daysSchema.parse(req.query);
        const history = leaderboardService.getHistory(req.user!.orgId, days);
        res.json({ history });
    });
}

// Singleton instance
export const leaderboardController = new LeaderboardController();
