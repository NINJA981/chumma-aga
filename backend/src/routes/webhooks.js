
import { Router } from 'express';
import { handleCallSync } from '../controllers/webhook.controller.js';

const router = Router();

// POST /api/webhooks/call-sync
router.post('/call-sync', handleCallSync);

export default router;
