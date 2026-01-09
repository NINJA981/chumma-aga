import { Router, Request, Response } from 'express';
import { query, queryOne, generateId, pgToSqlite } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { transcribeAudio } from '../services/ai/transcription.js';
import { analyzeConversation } from '../services/ai/analysis.js';
import { generateBattlecard } from '../services/ai/battlecard.js';

const router = Router();
router.use(authenticate);

// POST /api/ai/analyze - Analyze a call recording
router.post('/analyze', async (req: Request, res: Response) => {
    try {
        const { callId, audioUrl, transcript: existingTranscript } = req.body;

        // Verify call exists and belongs to org
        const call = queryOne(
            pgToSqlite('SELECT id, recording_url, transcript FROM calls WHERE id = $1 AND org_id = $2'),
            [callId, req.user!.orgId]
        );

        if (!call) {
            res.status(404).json({ error: 'Call not found' });
            return;
        }

        // Get or create transcript
        let transcript = existingTranscript || call.transcript;
        if (!transcript && (audioUrl || call.recording_url)) {
            transcript = await transcribeAudio(audioUrl || call.recording_url);

            // Save transcript to call
            query(pgToSqlite('UPDATE calls SET transcript = $1 WHERE id = $2'), [transcript, callId]);
        }

        if (!transcript) {
            res.status(400).json({ error: 'No audio or transcript available' });
            return;
        }

        // Analyze conversation (Conversation DNA)
        const analysis = await analyzeConversation(transcript);

        // Save analysis
        // SQLite supports ON CONFLICT logic
        const analysisId = generateId();
        query(
            pgToSqlite(`INSERT INTO call_analysis (id, call_id, sentiment_score, sentiment_label, sentiment_reasoning, summary_bullets, full_summary, action_items, keywords, topics, model_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (call_id) DO UPDATE SET
         sentiment_score = excluded.sentiment_score,
         sentiment_label = excluded.sentiment_label,
         sentiment_reasoning = excluded.sentiment_reasoning,
         summary_bullets = excluded.summary_bullets,
         full_summary = excluded.full_summary,
         action_items = excluded.action_items,
         keywords = excluded.keywords,
         topics = excluded.topics`),
            [
                analysisId,
                callId,
                analysis.sentimentScore,
                analysis.sentimentLabel,
                analysis.sentimentReasoning,
                analysis.summaryBullets,
                analysis.fullSummary,
                JSON.stringify(analysis.actionItems),
                analysis.keywords,
                analysis.topics,
                'gpt-4o-mini',
            ]
        );

        // Create follow-ups from action items
        for (const item of analysis.actionItems) {
            if (item.dueDate) {
                const followupId = generateId();
                query(
                    pgToSqlite(`INSERT INTO followups (id, org_id, rep_id, call_id, title, due_at, extracted_from_ai)
           VALUES ($1, $2, $3, $4, $5, $6, 1)`),
                    [followupId, req.user!.orgId, req.user!.id, callId, item.text, item.dueDate]
                );
            }
        }

        res.json({
            callId,
            analysis: {
                sentimentScore: analysis.sentimentScore,
                sentimentLabel: analysis.sentimentLabel,
                summaryBullets: analysis.summaryBullets,
                actionItems: analysis.actionItems,
            },
        });
    } catch (error) {
        console.error('AI analyze error:', error);
        res.status(500).json({ error: 'Failed to analyze call' });
    }
});

// POST /api/ai/battlecard - Generate real-time battlecard
router.post('/battlecard', async (req: Request, res: Response) => {
    try {
        const { objection, context } = req.body;

        if (!objection) {
            res.status(400).json({ error: 'Objection text required' });
            return;
        }

        // Check for existing battlecard
        const existing = queryOne<{ id: string; rebuttal_text: string }>(
            pgToSqlite(`SELECT id, rebuttal_text FROM battlecards 
       WHERE org_id = $1 AND objection_pattern ILIKE $2
       ORDER BY success_rate DESC NULLS LAST
       LIMIT 1`),
            [req.user!.orgId, `%${objection}%`]
        );

        if (existing) {
            // Track usage
            query(
                pgToSqlite('UPDATE battlecards SET times_shown = times_shown + 1 WHERE id = $1'),
                [existing.id]
            );

            res.json({
                battlecard: {
                    id: existing.id,
                    rebuttal: existing.rebuttal_text,
                    source: 'cached',
                },
            });
            return;
        }

        // Generate new battlecard with AI
        const rebuttal = await generateBattlecard(objection, context);

        // Save for future use
        const cardId = generateId();
        query(
            pgToSqlite(`INSERT INTO battlecards (id, org_id, objection_pattern, rebuttal_text, is_ai_generated)
       VALUES ($1, $2, $3, $4, 1)`),
            [cardId, req.user!.orgId, objection, rebuttal]
        );

        res.json({
            battlecard: {
                id: cardId,
                rebuttal,
                source: 'ai_generated',
            },
        });
    } catch (error) {
        console.error('Battlecard error:', error);
        res.status(500).json({ error: 'Failed to generate battlecard' });
    }
});

// GET /api/ai/battlecards - List org battlecards
router.get('/battlecards', async (req: Request, res: Response) => {
    try {
        const battlecards = query(
            pgToSqlite(`SELECT id, objection_pattern, rebuttal_text, rebuttal_type, times_shown, success_rate, is_ai_generated
       FROM battlecards
       WHERE org_id = $1
       ORDER BY times_shown DESC`),
            [req.user!.orgId]
        );

        res.json({ battlecards });
    } catch (error) {
        console.error('List battlecards error:', error);
        res.status(500).json({ error: 'Failed to fetch battlecards' });
    }
});

export default router;
