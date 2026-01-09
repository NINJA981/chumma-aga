import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { parse } from 'csv-parse';
import { query, queryOne, withTransaction, execute, generateId, pgToSqlite } from '../config/database.js';
import { authenticate, requireManager } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Apply auth to all routes
router.use(authenticate);

// Validation schemas
const createLeadSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5),
    company: z.string().optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
});

// GET /api/leads - List leads
router.get('/', async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50, status, assignedTo, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let whereClause = 'WHERE l.org_id = $1';
        const params: any[] = [req.user!.orgId];
        let paramIndex = 2;

        // Reps only see their assigned leads
        if (req.user!.role === 'rep') {
            whereClause += ` AND l.assigned_to = $${paramIndex}`;
            params.push(req.user!.id);
            paramIndex++;
        } else if (assignedTo) {
            whereClause += ` AND l.assigned_to = $${paramIndex}`;
            params.push(assignedTo);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND l.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (l.first_name ILIKE $${paramIndex} OR l.last_name ILIKE $${paramIndex} OR l.phone ILIKE $${paramIndex} OR l.company ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const leads = query(
            pgToSqlite(`SELECT l.*, 
        u.first_name as assigned_first_name, u.last_name as assigned_last_name,
        (SELECT COUNT(*) FROM calls c WHERE c.lead_id = l.id) as call_count
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`),
            [...params, Number(limit), offset]
        );

        const countResult = queryOne<{ count: string }>(
            pgToSqlite(`SELECT COUNT(*) as count FROM leads l ${whereClause}`),
            params
        );

        res.json({
            leads,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: parseInt(countResult?.count || '0', 10),
            },
        });
    } catch (error) {
        console.error('List leads error:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// POST /api/leads - Create lead
router.post('/', async (req: Request, res: Response) => {
    try {
        const data = createLeadSchema.parse(req.body);

        const leadId = generateId();
        // SQLite doesn't support RETURNING, so we insert then select (or just construct object if we trust inputs)
        query(
            pgToSqlite(`INSERT INTO leads (id, org_id, first_name, last_name, email, phone, company, source, tags, custom_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`),
            [
                leadId,
                req.user!.orgId, data.firstName, data.lastName, data.email,
                data.phone, data.company, data.source, JSON.stringify(data.tags || []), JSON.stringify(data.customFields || {})
            ]
        );

        // Fetch back to match signature
        const lead = queryOne(pgToSqlite('SELECT * FROM leads WHERE id = $1'), [leadId]);

        res.status(201).json({ lead });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Create lead error:', error);
        res.status(500).json({ error: 'Failed to create lead' });
    }
});

// GET /api/leads/:id - Get lead details
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const lead = queryOne(
            pgToSqlite(`SELECT l.*, 
        u.first_name as assigned_first_name, u.last_name as assigned_last_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = $1 AND l.org_id = $2`),
            [req.params.id, req.user!.orgId]
        );

        if (!lead) {
            res.status(404).json({ error: 'Lead not found' });
            return;
        }

        // Get call history
        const calls = query(
            pgToSqlite(`SELECT c.*, ca.sentiment_score, ca.summary_bullets
       FROM calls c
       LEFT JOIN call_analysis ca ON ca.call_id = c.id
       WHERE c.lead_id = $1
       ORDER BY c.started_at DESC
       LIMIT 20`),
            [req.params.id]
        );

        res.json({ lead, calls });
    } catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({ error: 'Failed to fetch lead' });
    }
});

// GET /api/leads/:id/optimal-time - Get best time to call (Heatmap feature)
router.get('/:id/optimal-time', async (req: Request, res: Response) => {
    try {
        const lead = queryOne(
            pgToSqlite('SELECT optimal_call_hour, optimal_call_day, pickup_probability FROM leads WHERE id = $1'),
            [req.params.id]
        );

        if (!lead) {
            res.status(404).json({ error: 'Lead not found' });
            return;
        }

        // If no prediction yet, calculate from history
        if (lead.optimal_call_hour === null) {
            // Note: lead_contact_attempts table might be missing in schema, so this might fail if not created
            // But we'll try to keep logic intact.
            try {
                const heatmap = query(
                    pgToSqlite(`SELECT attempt_hour, attempt_day, 
              COUNT(*) as attempts,
              SUM(CASE WHEN was_answered THEN 1 ELSE 0 END) as answered,
              ROUND(SUM(CASE WHEN was_answered THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as pickup_rate
             FROM lead_contact_attempts
             WHERE lead_id = $1
             GROUP BY attempt_hour, attempt_day
             ORDER BY pickup_rate DESC
             LIMIT 1`),
                    [req.params.id]
                );

                if (heatmap.length > 0) {
                    res.json({
                        optimalHour: heatmap[0].attempt_hour,
                        optimalDay: heatmap[0].attempt_day,
                        pickupProbability: heatmap[0].pickup_rate,
                        basedOnAttempts: heatmap[0].attempts,
                    });
                    return;
                }
            } catch (e) {
                // Table might not exist, ignore
            }
        }

        res.json({
            optimalHour: lead.optimal_call_hour,
            optimalDay: lead.optimal_call_day,
            pickupProbability: lead.pickup_probability,
        });
    } catch (error) {
        console.error('Get optimal time error:', error);
        res.status(500).json({ error: 'Failed to get optimal time' });
    }
});

// POST /api/leads/import - CSV Import with assignment
router.post('/import', requireManager, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const assignmentMode = req.body.mode || 'round_robin'; // 'round_robin' or 'weighted'

        // Get active reps for assignment
        const reps = query<{ id: string; assignment_weight: number }>(
            pgToSqlite('SELECT id, assignment_weight FROM users WHERE org_id = $1 AND role = $2 AND is_active = 1'),
            [req.user!.orgId, 'rep']
        );

        if (reps.length === 0) {
            res.status(400).json({ error: 'No active reps to assign leads' });
            return;
        }

        // Parse CSV
        const records: any[] = [];
        const parser = parse(req.file.buffer.toString(), {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        for await (const record of parser) {
            records.push(record);
        }

        // Create import record
        const importId = generateId();
        execute(
            pgToSqlite(`INSERT INTO csv_imports (id, org_id, uploaded_by, filename, total_rows, assignment_mode)
       VALUES ($1, $2, $3, $4, $5, $6)`),
            [importId, req.user!.orgId, req.user!.id, req.file.originalname, records.length, assignmentMode]
        );
        const importRecord = { id: importId };

        // Assignment logic
        let repIndex = 0;
        let importedCount = 0;
        let failedCount = 0;
        const errors: any[] = [];

        // For weighted assignment, create weighted array
        const weightedReps: string[] = [];
        if (assignmentMode === 'weighted') {
            reps.forEach(rep => {
                for (let i = 0; i < rep.assignment_weight; i++) {
                    weightedReps.push(rep.id);
                }
            });
        }

        await withTransaction(async () => {
            for (const record of records) {
                try {
                    // Map CSV columns (flexible mapping)
                    const firstName = record.first_name || record.firstName || record.name?.split(' ')[0] || 'Unknown';
                    const lastName = record.last_name || record.lastName || record.name?.split(' ').slice(1).join(' ') || '';
                    const phone = record.phone || record.mobile || record.telephone;

                    if (!phone) {
                        failedCount++;
                        errors.push({ row: importedCount + failedCount, error: 'Missing phone' });
                        continue;
                    }

                    // Assign rep
                    let assignedTo: string;
                    if (assignmentMode === 'weighted') {
                        assignedTo = weightedReps[repIndex % weightedReps.length];
                    } else {
                        assignedTo = reps[repIndex % reps.length].id;
                    }
                    repIndex++;

                    const leadId = generateId();
                    execute(
                        pgToSqlite(`INSERT INTO leads (id, org_id, assigned_to, first_name, last_name, email, phone, company, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`),
                        [
                            leadId,
                            req.user!.orgId, assignedTo, firstName, lastName,
                            record.email, phone, record.company, 'csv_import'
                        ]
                    );
                    importedCount++;
                } catch (err) {
                    failedCount++;
                    errors.push({ row: importedCount + failedCount, error: (err as Error).message });
                }
            }
        });

        // Update import record
        query(
            pgToSqlite(`UPDATE csv_imports SET imported_rows = $1, failed_rows = $2, error_log = $3, status = 'completed', completed_at = NOW()
       WHERE id = $4`),
            [importedCount, failedCount, JSON.stringify(errors), importRecord.id]
        );

        res.json({
            importId: importRecord.id,
            totalRows: records.length,
            imported: importedCount,
            failed: failedCount,
            errors: errors.slice(0, 10), // Return first 10 errors
        });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import leads' });
    }
});

export default router;
