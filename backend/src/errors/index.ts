/**
 * Custom Error Classes for VocalPulse
 * Provides structured error handling across the application
 */

/**
 * Base application error with status code and optional error code
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(
        statusCode: number,
        message: string,
        code: string = 'APP_ERROR',
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;

        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);

        // Set the prototype explicitly for proper instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }

    toJSON() {
        return {
            error: this.message,
            code: this.code,
            statusCode: this.statusCode,
        };
    }
}

/**
 * 400 Bad Request - Invalid input or validation failure
 */
export class ValidationError extends AppError {
    public readonly details?: unknown;

    constructor(message: string = 'Validation failed', details?: unknown) {
        super(400, message, 'VALIDATION_ERROR');
        this.details = details;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            details: this.details,
        };
    }
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Not authenticated') {
        super(401, message, 'UNAUTHORIZED');
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

/**
 * 403 Forbidden - Authenticated but lacks permissions
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(403, message, 'FORBIDDEN');
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends AppError {
    public readonly resource?: string;

    constructor(resource?: string, message?: string) {
        const msg = message || (resource ? `${resource} not found` : 'Resource not found');
        super(404, msg, 'NOT_FOUND');
        this.resource = resource;
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict') {
        super(409, message, 'CONFLICT');
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
    public readonly retryAfter?: number;

    constructor(message: string = 'Too many requests', retryAfter?: number) {
        super(429, message, 'RATE_LIMITED');
        this.retryAfter = retryAfter;
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}

/**
 * 500 Internal Server Error - Unexpected errors
 */
export class InternalError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(500, message, 'INTERNAL_ERROR', false);
        Object.setPrototypeOf(this, InternalError.prototype);
    }
}

/**
 * 503 Service Unavailable - External service or database unavailable
 */
export class ServiceUnavailableError extends AppError {
    public readonly service?: string;

    constructor(service?: string, message?: string) {
        const msg = message || (service ? `${service} is unavailable` : 'Service unavailable');
        super(503, msg, 'SERVICE_UNAVAILABLE');
        this.service = service;
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Create appropriate error from database errors
 */
export function fromDatabaseError(error: unknown): AppError {
    const message = error instanceof Error ? error.message : 'Database error';

    // SQLite constraint violations
    if (message.includes('UNIQUE constraint failed')) {
        return new ConflictError('Resource already exists');
    }

    if (message.includes('FOREIGN KEY constraint failed')) {
        return new ValidationError('Referenced resource does not exist');
    }

    if (message.includes('NOT NULL constraint failed')) {
        return new ValidationError('Required field is missing');
    }

    return new InternalError('Database operation failed');
}
