/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent JSON responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError, InternalError, isAppError } from './index.js';

/**
 * Convert Zod validation errors to our ValidationError format
 */
function fromZodError(error: ZodError): ValidationError {
    const details = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
    }));

    return new ValidationError('Validation failed', details);
}

/**
 * Global error handler middleware
 * Must be registered after all routes
 */
export function globalErrorHandler(
    error: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void {
    // Log error for debugging
    console.error(`[ERROR] ${req.method} ${req.path}:`, error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(validationError.statusCode).json(validationError.toJSON());
        return;
    }

    // Handle our custom AppErrors
    if (isAppError(error)) {
        res.status(error.statusCode).json(error.toJSON());
        return;
    }

    // Handle unknown errors
    const internalError = new InternalError(
        process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message
    );

    res.status(internalError.statusCode).json(internalError.toJSON());
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler<T>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: `Route ${req.method} ${req.path} not found`,
        code: 'ROUTE_NOT_FOUND',
        statusCode: 404,
    });
}
