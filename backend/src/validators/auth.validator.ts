/**
 * Zod Validation Schemas for Auth
 */

import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    orgName: z.string().min(1).optional(),
    orgId: z.string().uuid('Invalid organization ID').optional(),
}).refine(
    (data) => data.orgName || data.orgId,
    { message: 'Either organization name or ID is required', path: ['orgName'] }
);

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
