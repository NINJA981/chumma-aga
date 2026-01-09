/**
 * Organization Repository - Data access for organizations
 */

import { BaseRepository, queryOne, execute, generateId } from './base.repository.js';
import type { Organization } from '../types/index.js';

interface OrgRow {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
}

interface CreateOrgData {
    name: string;
    slug?: string;
}

export class OrganizationRepository extends BaseRepository<OrgRow> {
    constructor() {
        super('organizations');
    }

    /**
     * Find organization by slug
     */
    findBySlug(slug: string): OrgRow | null {
        return queryOne<OrgRow>(
            'SELECT * FROM organizations WHERE slug = ?',
            [slug]
        );
    }

    /**
     * Create a new organization
     */
    createOrg(data: CreateOrgData): string {
        const id = generateId();
        const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-');

        execute(
            'INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)',
            [id, data.name, slug]
        );

        return id;
    }

    /**
     * Check if slug already exists
     */
    slugExists(slug: string): boolean {
        const result = queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM organizations WHERE slug = ?',
            [slug]
        );
        return (result?.count || 0) > 0;
    }

    /**
     * Get organization with user count
     */
    findWithStats(orgId: string): (OrgRow & { user_count: number; lead_count: number }) | null {
        return this.rawQueryOne<OrgRow & { user_count: number; lead_count: number }>(
            `SELECT o.*,
                (SELECT COUNT(*) FROM users WHERE org_id = o.id AND is_active = 1) as user_count,
                (SELECT COUNT(*) FROM leads WHERE org_id = o.id) as lead_count
             FROM organizations o
             WHERE o.id = ?`,
            [orgId]
        );
    }

    /**
     * Convert database row to Organization entity
     */
    static toEntity(row: OrgRow): Organization {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

// Singleton instance
export const organizationRepository = new OrganizationRepository();
