import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute, generateId, pgToSqlite } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Validation schemas
const createFollowupSchema = z.object({
    leadId: z.string().optional(),
    callId: z.string().optional(),
    dueDate: z.string(),
    description: z.string().optional(),
});

const updateFollowupSchema = z.object({
    dueDate: z.string().optional(),
    description: z.string().optional(),
});

// GET /api/followups - List user's followups
router.get('/', async (req: Request, res: Response) => {
    try {
        const { filter = 'all' } = req.query;
        const userId = req.user!.id;
        const orgId = req.user!.orgId;

        let whereClause = 'WHERE f.rep_id = $1 AND f.org_id = $2';
        const params: any[] = [userId, orgId];

        // Add date filters
        const today = new Date().toISOString().split('T')[0];

        if (filter === 'overdue') {
            whereClause += ` AND f.due_date < '${today}' AND f.is_completed = 0`;
        } else if (filter === 'today') {
            whereClause += ` AND DATE(f.due_date) = '${today}' AND f.is_completed = 0`;
        } else if (filter === 'upcoming') {
            whereClause += ` AND f.due_date > '${today}' AND f.is_completed = 0`;
        } else if (filter === 'pending') {
            whereClause += ' AND f.is_completed = 0';
        }

        const followups = query(
            pgToSqlite(`SELECT f.*, 
                l.first_name as lead_first_name, l.last_name as lead_last_name, l.phone as lead_phone,
                l.company as lead_company, l.status as lead_status
            FROM followups f
            LEFT JOIN leads l ON f.lead_id = l.id
            ${whereClause}
            ORDER BY f.due_date ASC`),
            params
        );

        // Count by category
        const countOverdue = queryOne<{ count: number }>(
            pgToSqlite(`SELECT COUNT(*) as count FROM followups f 
                WHERE f.rep_id = $1 AND f.org_id = $2 AND f.due_date < '${today}' AND f.is_completed = 0`),
            [userId, orgId]
        );

        const countToday = queryOne<{ count: number }>(
            pgToSqlite(`SELECT COUNT(*) as count FROM followups f 
                WHERE f.rep_id = $1 AND f.org_id = $2 AND DATE(f.due_date) = '${today}' AND f.is_completed = 0`),
            [userId, orgId]
        );

        const countUpcoming = queryOne<{ count: number }>(
            pgToSqlite(`SELECT COUNT(*) as count FROM followups f 
                WHERE f.rep_id = $1 AND f.org_id = $2 AND f.due_date > '${today}' AND f.is_completed = 0`),
            [userId, orgId]
        );

        res.json({
            followups,
            counts: {
                overdue: countOverdue?.count || 0,
                today: countToday?.count || 0,
                upcoming: countUpcoming?.count || 0,
            },
        });
    } catch (error) {
        console.error('List followups error:', error);
        res.status(500).json({ error: 'Failed to fetch followups' });
    }
});

// POST /api/followups - Create new followup
router.post('/', async (req: Request, res: Response) => {
    try {
        const data = createFollowupSchema.parse(req.body);

        const followupId = generateId();
        execute(
            pgToSqlite(`INSERT INTO followups (id, org_id, rep_id, lead_id, call_id, due_date, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7)`),
            [
                followupId,
                req.user!.orgId,
                req.user!.id,
                data.leadId,
                data.callId,
                data.dueDate,
                data.description,
            ]
        );

        const followup = queryOne(
            pgToSqlite('SELECT * FROM followups WHERE id = $1'),
            [followupId]
        );

        res.status(201).json({ followup });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Create followup error:', error);
        res.status(500).json({ error: 'Failed to create followup' });
    }
});

// PUT /api/followups/:id - Update followup
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const data = updateFollowupSchema.parse(req.body);

        // Check ownership
        const existing = queryOne(
            pgToSqlite('SELECT id FROM followups WHERE id = $1 AND rep_id = $2'),
            [req.params.id, req.user!.id]
        );

        if (!existing) {
            res.status(404).json({ error: 'Followup not found' });
            return;
        }

        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (data.dueDate) {
            updates.push(`due_date = $${paramIndex}`);
            params.push(data.dueDate);
            paramIndex++;
        }

        if (data.description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            params.push(data.description);
            paramIndex++;
        }

        if (updates.length > 0) {
            params.push(req.params.id);
            execute(
                pgToSqlite(`UPDATE followups SET ${updates.join(', ')} WHERE id = $${paramIndex}`),
                params
            );
        }

        res.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Update followup error:', error);
        res.status(500).json({ error: 'Failed to update followup' });
    }
});

// PUT /api/followups/:id/complete - Mark as completed
router.put('/:id/complete', async (req: Request, res: Response) => {
    try {
        const existing = queryOne(
            pgToSqlite('SELECT id FROM followups WHERE id = $1 AND rep_id = $2'),
            [req.params.id, req.user!.id]
        );

        if (!existing) {
            res.status(404).json({ error: 'Followup not found' });
            return;
        }

        execute(
            pgToSqlite(`UPDATE followups SET is_completed = 1, completed_at = datetime('now') WHERE id = $1`),
            [req.params.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Complete followup error:', error);
        res.status(500).json({ error: 'Failed to complete followup' });
    }
});

// DELETE /api/followups/:id - Delete followup
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const existing = queryOne(
            pgToSqlite('SELECT id FROM followups WHERE id = $1 AND rep_id = $2'),
            [req.params.id, req.user!.id]
        );

        if (!existing) {
            res.status(404).json({ error: 'Followup not found' });
            return;
        }

        execute(
            pgToSqlite('DELETE FROM followups WHERE id = $1'),
            [req.params.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Delete followup error:', error);
        res.status(500).json({ error: 'Failed to delete followup' });
    }
});

export default router;
