/**
 * Lead Controller - HTTP handlers for lead management
 */

import { Request, Response } from 'express';
import { leadService } from '../services/lead.service.js';
import {
    createLeadSchema,
    updateLeadSchema,
    leadFiltersSchema,
    importLeadsSchema
} from '../validators/lead.validator.js';
import { asyncHandler } from '../errors/handler.js';

export class LeadController {
    /**
     * GET /api/leads
     */
    list = asyncHandler(async (req: Request, res: Response) => {
        const filters = leadFiltersSchema.parse(req.query);
        const result = leadService.listLeads(req.user!.orgId, filters);

        res.json({
            leads: result.data,
            pagination: result.pagination,
        });
    });

    /**
     * GET /api/leads/:id
     */
    get = asyncHandler(async (req: Request, res: Response) => {
        const lead = leadService.getLead(req.params.id, req.user!.orgId);
        res.json({ lead });
    });

    /**
     * POST /api/leads
     */
    create = asyncHandler(async (req: Request, res: Response) => {
        const data = createLeadSchema.parse(req.body);
        const lead = leadService.createLead(req.user!.orgId, data);
        res.status(201).json({ lead });
    });

    /**
     * PUT /api/leads/:id
     */
    update = asyncHandler(async (req: Request, res: Response) => {
        const data = updateLeadSchema.parse(req.body);
        const lead = leadService.updateLead(req.params.id, req.user!.orgId, data);
        res.json({ lead });
    });

    /**
     * DELETE /api/leads/:id
     */
    delete = asyncHandler(async (req: Request, res: Response) => {
        leadService.deleteLead(req.params.id, req.user!.orgId);
        res.json({ success: true });
    });

    /**
     * POST /api/leads/import
     */
    import = asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const { mode } = importLeadsSchema.parse(req.body);
        const result = await leadService.importCSV(
            req.user!.orgId,
            req.user!.id,
            req.file.buffer,
            req.file.originalname,
            mode
        );

        res.status(201).json(result);
    });

    /**
     * GET /api/leads/:id/optimal-time
     */
    getOptimalTime = asyncHandler(async (req: Request, res: Response) => {
        const result = leadService.getOptimalCallTime(req.params.id);
        res.json(result);
    });
}

// Singleton instance
export const leadController = new LeadController();
