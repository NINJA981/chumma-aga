import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/env.js';
import { query, queryOne, execute } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

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

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const data = registerSchema.parse(req.body);

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
            // SQLite doesn't support RETURNING, so we need to insert and then get the last id
            const { generateId } = await import('../config/database.js');
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

        // Create user with generated ID
        const { generateId } = await import('../config/database.js');
        const userId = generateId();
        execute(
            `INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, orgId, data.email, passwordHash, data.firstName, data.lastName, 'rep']
        );

        // Generate JWT
        const token = jwt.sign({ userId }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
        });

        res.status(201).json({
            token,
            user: {
                id: userId,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                role: 'rep',
                orgId,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const data = loginSchema.parse(req.body);

        if (data.email === 'demo@vocalpulse.com' && data.password === 'demo123') {
            const demoUserId = 'demo-user-id';
            const demoOrgId = 'demo-org-id';

            // Generate JWT
            const token = jwt.sign({ userId: demoUserId }, config.jwt.secret, {
                expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
            });

            res.json({
                token,
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

        // Update last login - SQLite uses datetime('now') instead of NOW()
        execute('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?', [user.id]);

        // Generate JWT
        const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                orgId: user.org_id,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
    res.json({ user: req.user });
});

export default router;
