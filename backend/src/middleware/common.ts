import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const requestId = uuidv4();
    const start = Date.now();

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    // Log request
    console.log(`→ ${req.method} ${req.path}`, {
        requestId,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        ip: req.ip,
    });

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusEmoji = res.statusCode < 400 ? '✓' : '✗';
        console.log(`${statusEmoji} ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    });

    next();
}

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.error('Error:', err.message, err.stack);

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(500).json({
        error: isProduction ? 'Internal server error' : err.message,
        ...(isProduction ? {} : { stack: err.stack }),
    });
}

export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
    });
}
