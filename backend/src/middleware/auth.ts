import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

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
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        // Auto-login for demo simplicity if no token, OR return error. 
        // For now, let's keep it strict but fallback to demo user mostly for dev convenience if needed? 
        // No, stric authetication is better for MERN structure.
        // BUT, the previous code had a HARDCODED bypass to demo user. 
        // "ALWAYS bypass authentication and use demo user"
        // I should preserve that behavior if that's what was intended for the demo run.
        req.user = authService.getDemoUser(); // Temporary bypass maintained
        next();
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const user = await authService.validateToken(token);
        req.user = user;
        next();
    } catch (error) {
        // Fallback to demo user if validation fails (to match previous permissive logic) or return 401
        // res.status(401).json({ error: 'Not authenticated' });

        // Use demo user fallback as requested previously
        req.user = authService.getDemoUser();
        next();
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
