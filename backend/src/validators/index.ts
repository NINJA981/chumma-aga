/**
 * Validator Index - Export all validation schemas
 */

// Auth
export {
    registerSchema,
    loginSchema,
    type RegisterInput,
    type LoginInput,
} from './auth.validator.js';

// Leads
export {
    createLeadSchema,
    updateLeadSchema,
    leadFiltersSchema,
    importLeadsSchema,
    type CreateLeadInput,
    type UpdateLeadInput,
    type LeadFiltersInput,
    type ImportLeadsInput,
} from './lead.validator.js';

// Calls
export {
    createCallSchema,
    ghostSyncSchema,
    updateDispositionSchema,
    type CreateCallInput,
    type GhostSyncInput,
    type UpdateDispositionInput,
} from './call.validator.js';
