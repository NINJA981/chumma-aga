/**
 * Call Controller - HTTP handlers for call tracking
 */

import { Request, Response } from 'express';
import { callService } from '../services/call.service.js';
import {
    createCallSchema,
    ghostSyncSchema,
    updateDispositionSchema
} from '../validators/call.validator.js';
import { asyncHandler } from '../errors/handler.js';

export class CallController {
    /**
     * POST /api/calls
     */
    create = asyncHandler(async (req: Request, res: Response) => {
        const data = createCallSchema.parse(req.body);
        const result = await callService.createCall(req.user!.orgId, req.user!.id, data);
        res.status(201).json(result);
    });

    /**
     * POST /api/calls/ghost-sync
     */
    ghostSync = asyncHandler(async (req: Request, res: Response) => {
        const data = ghostSyncSchema.parse(req.body);
        const result = await callService.ghostSync(req.user!.orgId, req.user!.id, data);
        res.status(201).json({
            ...result,
            synced: true,
        });
    });

    /**
     * GET /api/calls/:id
     */
    get = asyncHandler(async (req: Request, res: Response) => {
        const call = callService.getCall(req.params.id, req.user!.orgId);
        res.json({ call });
    });

    /**
     * PUT /api/calls/:id/disposition
     */
    updateDisposition = asyncHandler(async (req: Request, res: Response) => {
        const { disposition, notes } = updateDispositionSchema.parse(req.body);
        const success = callService.updateDisposition(
            req.params.id,
            req.user!.orgId,
            disposition,
            notes
        );
        res.json({ success });
    });
}

// Singleton instance
export const callController = new CallController();
