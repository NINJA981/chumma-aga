/**
 * Zod Validation Schemas for Calls
 */

import { z } from 'zod';

const callTypeEnum = z.enum(['inbound', 'outbound']);
const callSourceEnum = z.enum(['voip', 'sim', 'manual']);
const dispositionEnum = z.enum([
    'no_answer',
    'busy',
    'voicemail',
    'callback_requested',
    'not_interested',
    'qualified',
    'converted',
]);

export const createCallSchema = z.object({
    leadId: z.string().uuid().optional(),
    phoneNumber: z.string().min(5, 'Phone number must be at least 5 characters'),
    callType: callTypeEnum.default('outbound'),
    callSource: callSourceEnum.default('manual'),
    startedAt: z.string().datetime('Invalid start time'),
    endedAt: z.string().datetime('Invalid end time').optional(),
    durationSeconds: z.number().min(0, 'Duration cannot be negative'),
    ringDurationSeconds: z.number().min(0).optional(),
    isAnswered: z.boolean().default(false),
    disposition: dispositionEnum.optional(),
    notes: z.string().optional(),
    recordingUrl: z.string().url().optional(),
});

export const ghostSyncSchema = z.object({
    phoneNumber: z.string().min(5, 'Phone number is required'),
    callType: callTypeEnum.default('outbound'),
    startedAt: z.string().datetime('Invalid start time'),
    endedAt: z.string().datetime('Invalid end time'),
    durationSeconds: z.number().min(0),
});

export const updateDispositionSchema = z.object({
    disposition: dispositionEnum,
    notes: z.string().optional(),
});

export type CreateCallInput = z.infer<typeof createCallSchema>;
export type GhostSyncInput = z.infer<typeof ghostSyncSchema>;
export type UpdateDispositionInput = z.infer<typeof updateDispositionSchema>;
