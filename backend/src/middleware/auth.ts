import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { queryOne } from '../config/database.js';

export interface AuthUser {
    id: string;
    orgId: string;
    email: string;
    role: 'admin' | 'manager' | 'rep';
    firstName: string;
    lastName: string;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

        const user = await queryOne<AuthUser>(
            `SELECT id, org_id as "orgId", email, role, first_name as "firstName", last_name as "lastName"
       FROM users WHERE id = $1 AND is_active = true`,
            [decoded.userId]
        );

        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

export function requireRole(...roles: Array<'admin' | 'manager' | 'rep'>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
    requireRole('admin', 'manager')(req, res, next);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    requireRole('admin')(req, res, next);
}
