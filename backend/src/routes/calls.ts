import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, generateId, pgToSqlite } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { updateLeaderboardMiddleware, CallData } from '../middleware/leaderboard.js';
import { emitGhostSync } from '../config/socket.js';

const router = Router();
router.use(authenticate);

// Validation schemas
const createCallSchema = z.object({
    leadId: z.string().uuid().optional(),
    phoneNumber: z.string().min(5),
    callType: z.enum(['outbound', 'inbound']).default('outbound'),
    callSource: z.enum(['voip', 'sim', 'manual']).default('sim'),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime().optional(),
    durationSeconds: z.number().min(0).default(0),
    ringDurationSeconds: z.number().min(0).optional(),
    disposition: z.enum([
        'connected', 'no_answer', 'busy', 'voicemail',
        'wrong_number', 'callback_scheduled', 'converted', 'not_interested'
    ]).optional(),
    isAnswered: z.boolean().default(false),
    notes: z.string().optional(),
    recordingUrl: z.string().url().optional(),
});

const ghostSyncSchema = z.object({
    phoneNumber: z.string().min(5),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    durationSeconds: z.number().min(0),
    callType: z.enum(['outbound', 'inbound']).default('outbound'),
});

// POST /api/calls - Log a call
router.post('/', async (req: Request, res: Response) => {
    try {
        const data = createCallSchema.parse(req.body);

        // If phone number provided, try to find matching lead
        let leadId = data.leadId;
        let leadName: string | undefined;

        if (!leadId && data.phoneNumber) {
            const lead = queryOne<{ id: string; first_name: string; last_name: string }>(
                pgToSqlite('SELECT id, first_name, last_name FROM leads WHERE phone = $1 AND org_id = $2'),
                [data.phoneNumber.replace(/\D/g, '').slice(-10), req.user!.orgId]
            );
            if (lead) {
                leadId = lead.id;
                leadName = `${lead.first_name} ${lead.last_name}`.trim();
            }
        }

        // Insert call with generated ID (SQLite doesn't support RETURNING)
        const callId = generateId();
        query(
            pgToSqlite(`INSERT INTO calls (
        id, org_id, rep_id, lead_id, phone_number, call_type, call_source,
        started_at, ended_at, duration_seconds, ring_duration_seconds,
        disposition, is_answered, notes, recording_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`),
            [
                callId, req.user!.orgId, req.user!.id, leadId, data.phoneNumber,
                data.callType, data.callSource, data.startedAt, data.endedAt,
                data.durationSeconds, data.ringDurationSeconds, data.disposition,
                data.isAnswered ? 1 : 0, data.notes, data.recordingUrl
            ]
        );

        // Update lead last contacted
        if (leadId) {
            query(pgToSqlite('UPDATE leads SET last_contacted_at = NOW() WHERE id = $1'), [leadId]);

            // Record contact attempt for heatmap
            const callDate = new Date(data.startedAt);
            query(
                pgToSqlite(`INSERT INTO lead_contact_attempts (id, lead_id, call_id, attempt_hour, attempt_day, was_answered)
         VALUES ($1, $2, $3, $4, $5, $6)`),
                [generateId(), leadId, callId, callDate.getHours(), callDate.getDay(), data.isAnswered ? 1 : 0]
            );
        }

        // Update leaderboard
        const callData: CallData = {
            repId: req.user!.id,
            orgId: req.user!.orgId,
            repName: `${req.user!.firstName} ${req.user!.lastName}`,
            durationSeconds: data.durationSeconds,
            isAnswered: data.isAnswered,
            disposition: data.disposition,
            leadName,
        };
        await updateLeaderboardMiddleware(callData);

        res.status(201).json({ callId });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Create call error:', error);
        res.status(500).json({ error: 'Failed to log call' });
    }
});

// POST /api/calls/ghost-sync - Background sync from mobile
router.post('/ghost-sync', async (req: Request, res: Response) => {
    try {
        const data = ghostSyncSchema.parse(req.body);

        // Find matching lead by phone
        const lead = queryOne<{ id: string; first_name: string; last_name: string }>(
            pgToSqlite('SELECT id, first_name, last_name FROM leads WHERE phone LIKE $1 AND org_id = $2'),
            [`%${data.phoneNumber.replace(/\D/g, '').slice(-10)}%`, req.user!.orgId]
        );

        // Insert call with ghost sync flag
        const callId = generateId();
        query(
            pgToSqlite(`INSERT INTO calls (
        id, org_id, rep_id, lead_id, phone_number, call_type, call_source,
        started_at, ended_at, duration_seconds, is_answered, synced_via_ghost
      ) VALUES ($1, $2, $3, $4, $5, $6, 'sim', $7, $8, $9, $10, 1)`),
            [
                callId, req.user!.orgId, req.user!.id, lead?.id, data.phoneNumber,
                data.callType, data.startedAt, data.endedAt, data.durationSeconds,
                data.durationSeconds > 0 ? 1 : 0
            ]
        );

        // Update leaderboard
        const callData: CallData = {
            repId: req.user!.id,
            orgId: req.user!.orgId,
            repName: `${req.user!.firstName} ${req.user!.lastName}`,
            durationSeconds: data.durationSeconds,
            isAnswered: data.durationSeconds > 0,
            leadName: lead ? `${lead.first_name} ${lead.last_name}`.trim() : undefined,
        };
        await updateLeaderboardMiddleware(callData);

        // Emit ghost sync event for real-time dashboard
        emitGhostSync(req.user!.orgId, {
            repId: req.user!.id,
            repName: `${req.user!.firstName} ${req.user!.lastName}`,
            callDuration: data.durationSeconds,
            leadPhone: data.phoneNumber,
        });

        res.status(201).json({
            callId,
            synced: true,
            matchedLead: lead?.id,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Ghost sync error:', error);
        res.status(500).json({ error: 'Failed to sync call' });
    }
});

// GET /api/calls/:id - Get call details
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const call = queryOne(
            pgToSqlite(`SELECT c.*, 
        l.first_name as lead_first_name, l.last_name as lead_last_name,
        u.first_name as rep_first_name, u.last_name as rep_last_name,
        ca.sentiment_score, ca.sentiment_label, ca.summary_bullets, ca.action_items
       FROM calls c
       LEFT JOIN leads l ON c.lead_id = l.id
       LEFT JOIN users u ON c.rep_id = u.id
       LEFT JOIN call_analysis ca ON ca.call_id = c.id
       WHERE c.id = $1 AND c.org_id = $2`),
            [req.params.id, req.user!.orgId]
        );

        if (!call) {
            res.status(404).json({ error: 'Call not found' });
            return;
        }

        res.json({ call });
    } catch (error) {
        console.error('Get call error:', error);
        res.status(500).json({ error: 'Failed to fetch call' });
    }
});

// PUT /api/calls/:id/disposition - Update disposition
router.put('/:id/disposition', async (req: Request, res: Response) => {
    try {
        const { disposition, notes } = req.body;

        query(
            pgToSqlite('UPDATE calls SET disposition = $1, notes = $2 WHERE id = $3 AND org_id = $4'),
            [disposition, notes, req.params.id, req.user!.orgId]
        );

        // If converted, add bonus XP
        if (disposition === 'converted') {
            const callData: CallData = {
                repId: req.user!.id,
                orgId: req.user!.orgId,
                repName: `${req.user!.firstName} ${req.user!.lastName}`,
                durationSeconds: 0,
                isAnswered: true,
                disposition: 'converted',
            };
            await updateLeaderboardMiddleware(callData);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Update disposition error:', error);
        res.status(500).json({ error: 'Failed to update disposition' });
    }
});

export default router;
