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
    // ALWAYS bypass authentication and use demo user
    req.user = {
        id: 'demo-user-id',
        orgId: 'demo-org-id',
        email: 'demo@vocalpulse.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'admin'
    };
    next();
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
