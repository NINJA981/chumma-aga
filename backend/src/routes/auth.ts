import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/env.js';
import { query, queryOne, execute, generateId } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    orgName: z.string().min(1).optional(),
    orgId: z.string().uuid().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const refreshTokenSchema = z.object({
    // We expect cookie, but maybe body fallback? No, cookie only for security.
});

// Helper to set refresh cookie
const setRefreshCookie = (res: Response, token: string) => {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: config.isProduction, // Secure in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

// POST /api/auth/register
router.post('/register', validateRequest(registerSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;

    // Check if email exists
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [data.email]);
    if (existing) {
        res.status(400).json({ error: 'Email already registered' });
        return;
    }

    // Create org if needed
    let orgId: string | undefined;
    if (data.orgId) {
        const orgExists = queryOne('SELECT id FROM organizations WHERE id = ?', [data.orgId]);
        if (!orgExists) {
            res.status(400).json({ error: 'Invalid organization ID' });
            return;
        }
        orgId = data.orgId;
    } else if (data.orgName) {
        const slug = data.orgName.toLowerCase().replace(/\s+/g, '-');
        orgId = generateId();
        execute(
            'INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)',
            [orgId, data.orgName, slug]
        );
    }

    if (!orgId) {
        res.status(400).json({ error: 'Organization required' });
        return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const userId = generateId();
    execute(
        `INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, orgId, data.email, passwordHash, data.firstName, data.lastName, 'rep']
    );

    // Generate JWTs
    const accessToken = jwt.sign({ userId }, config.jwt.secret, {
        expiresIn: '15m',
    });
    const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwt.secret, {
        expiresIn: '7d',
    });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
        accessToken,
        user: {
            id: userId,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: 'rep',
            orgId,
        },
    });
}));

// POST /api/auth/login
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;

    // Hardcoded Demo Login
    if (data.email === 'demo@vocalpulse.com' && data.password === 'demo123') {
        const demoUserId = 'demo-user-id'; // From seed
        const demoOrgId = 'demo-org-vocalpulse'; // From seed

        const accessToken = jwt.sign({ userId: demoUserId }, config.jwt.secret, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: demoUserId, type: 'refresh' }, config.jwt.secret, { expiresIn: '7d' });

        setRefreshCookie(res, refreshToken);

        res.json({
            accessToken,
            user: {
                id: demoUserId,
                email: data.email,
                firstName: "Demo",
                lastName: "User",
                role: "admin",
                orgId: demoOrgId,
            },
        });
        return;
    }

    const user = queryOne<{
        id: string;
        org_id: string;
        email: string;
        password_hash: string;
        first_name: string;
        last_name: string;
        role: string;
    }>(
        `SELECT id, org_id, email, password_hash, first_name, last_name, role
       FROM users WHERE email = ? AND is_active = 1`,
        [data.email]
    );

    if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    const validPassword = await bcrypt.compare(data.password, user.password_hash);
    if (!validPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    // Update last login
    execute('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?', [user.id]);

    // Generate JWTs
    const accessToken = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwt.secret, { expiresIn: '7d' });

    setRefreshCookie(res, refreshToken);

    res.json({
        accessToken,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            orgId: user.org_id,
        },
    });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;

    if (!token) {
        res.status(401).json({ error: 'No refresh token' });
        return;
    }

    try {
        const payload = jwt.verify(token, config.jwt.secret) as any;

        // Verify user still exists
        const user = queryOne('SELECT id FROM users WHERE id = ? AND is_active = 1', [payload.userId]);
        if (!user) {
            res.status(401).json({ error: 'User not found or inactive' });
            return;
        }

        const accessToken = jwt.sign({ userId: payload.userId }, config.jwt.secret, { expiresIn: '15m' });

        res.json({ accessToken });
    } catch (e) {
        res.status(403).json({ error: 'Invalid refresh token' });
    }
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie('refreshToken');
    res.json({ success: true });
}));

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
    res.json({ user: req.user });
});

export default router;
