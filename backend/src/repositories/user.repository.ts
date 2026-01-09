/**
 * User Repository - Data access for users
 */

import { BaseRepository, queryOne, execute, generateId, pgToSqlite } from './base.repository.js';
import type { User, UserRole } from '../types/index.js';

interface UserRow {
    id: string;
    org_id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    is_active: number;
    lead_assignment_weight: number;
    avatar_url: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
}

interface CreateUserData {
    org_id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role?: UserRole;
}

export class UserRepository extends BaseRepository<UserRow> {
    constructor() {
        super('users');
    }

    /**
     * Find user by email
     */
    findByEmail(email: string): UserRow | null {
        return queryOne<UserRow>(
            'SELECT * FROM users WHERE email = ? AND is_active = 1',
            [email]
        );
    }

    /**
     * Find all users in an organization
     */
    findByOrgId(orgId: string, activeOnly: boolean = true): UserRow[] {
        const activeClause = activeOnly ? 'AND is_active = 1' : '';
        return this.rawQuery<UserRow>(
            `SELECT * FROM users WHERE org_id = ? ${activeClause} ORDER BY first_name, last_name`,
            [orgId]
        );
    }

    /**
     * Find all reps in an organization (for lead assignment)
     */
    findRepsByOrgId(orgId: string): UserRow[] {
        return this.rawQuery<UserRow>(
            `SELECT * FROM users 
             WHERE org_id = ? AND role = 'rep' AND is_active = 1 
             ORDER BY lead_assignment_weight DESC`,
            [orgId]
        );
    }

    /**
     * Create a new user
     */
    createUser(data: CreateUserData): string {
        const id = generateId();
        execute(
            `INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, data.org_id, data.email, data.password_hash, data.first_name, data.last_name, data.role || 'rep']
        );
        return id;
    }

    /**
     * Update last login timestamp
     */
    updateLastLogin(userId: string): void {
        execute(
            "UPDATE users SET last_login_at = datetime('now') WHERE id = ?",
            [userId]
        );
    }

    /**
     * Check if email already exists
     */
    emailExists(email: string): boolean {
        const result = queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM users WHERE email = ?',
            [email]
        );
        return (result?.count || 0) > 0;
    }

    /**
     * Get user with organization info
     */
    findWithOrg(userId: string): (UserRow & { org_name: string; org_slug: string }) | null {
        return this.rawQueryOne<UserRow & { org_name: string; org_slug: string }>(
            `SELECT u.*, o.name as org_name, o.slug as org_slug
             FROM users u
             JOIN organizations o ON u.org_id = o.id
             WHERE u.id = ?`,
            [userId]
        );
    }

    /**
     * Convert database row to User entity
     */
    static toEntity(row: UserRow): User {
        return {
            id: row.id,
            orgId: row.org_id,
            email: row.email,
            passwordHash: row.password_hash,
            firstName: row.first_name,
            lastName: row.last_name,
            role: row.role,
            isActive: row.is_active === 1,
            leadAssignmentWeight: row.lead_assignment_weight,
            avatarUrl: row.avatar_url || undefined,
            lastLoginAt: row.last_login_at || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

// Singleton instance
export const userRepository = new UserRepository();
