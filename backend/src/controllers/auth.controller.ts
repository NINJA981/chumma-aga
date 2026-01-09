/**
 * Auth Controller - HTTP handlers for authentication
 */

import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { asyncHandler } from '../errors/handler.js';

export class AuthController {
    /**
     * POST /api/auth/register
     */
    register = asyncHandler(async (req: Request, res: Response) => {
        const data = registerSchema.parse(req.body);
        const result = await authService.register(data);
        res.status(201).json(result);
    });

    /**
     * POST /api/auth/login
     */
    login = asyncHandler(async (req: Request, res: Response) => {
        const data = loginSchema.parse(req.body);
        const result = await authService.login(data);
        res.json(result);
    });

    /**
     * GET /api/auth/me
     */
    me = asyncHandler(async (req: Request, res: Response) => {
        res.json({ user: req.user });
    });
}

// Singleton instance
export const authController = new AuthController();
