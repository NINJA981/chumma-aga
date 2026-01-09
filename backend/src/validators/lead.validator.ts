/**
 * Zod Validation Schemas for Leads
 */

import { z } from 'zod';

const leadStatusEnum = z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']);

export const createLeadSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(5, 'Phone number must be at least 5 characters'),
    company: z.string().optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
});

export const updateLeadSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(5).optional(),
    company: z.string().optional(),
    status: leadStatusEnum.optional(),
    notes: z.string().optional(),
    assignedTo: z.string().uuid().optional(),
});

export const leadFiltersSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
    status: leadStatusEnum.optional(),
    assignedTo: z.string().uuid().optional(),
    search: z.string().optional(),
});

export const importLeadsSchema = z.object({
    mode: z.enum(['round_robin', 'weighted']).default('round_robin'),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadFiltersInput = z.infer<typeof leadFiltersSchema>;
export type ImportLeadsInput = z.infer<typeof importLeadsSchema>;
