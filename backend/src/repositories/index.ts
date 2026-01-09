/**
 * Repository Index - Export all repositories
 */

// Base
export { BaseRepository, PaginatedResult, QueryOptions } from './base.repository.js';

// Entity Repositories
export { UserRepository, userRepository } from './user.repository.js';
export { OrganizationRepository, organizationRepository } from './organization.repository.js';
export { LeadRepository, leadRepository } from './lead.repository.js';
export { CallRepository, callRepository } from './call.repository.js';

// Re-export database utilities
export {
    db,
    query,
    queryOne,
    execute,
    generateId,
    pgToSqlite,
    withTransaction
} from './base.repository.js';
