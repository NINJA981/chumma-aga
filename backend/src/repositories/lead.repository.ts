/**
 * Lead Repository - Data access for leads
 */

import { BaseRepository, query, queryOne, execute, generateId, pgToSqlite, withTransaction } from './base.repository.js';
import type { Lead, LeadStatus, LeadFilters, PaginatedResult } from '../types/index.js';

interface LeadRow {
    id: string;
    org_id: string;
    assigned_to: string | null;
    first_name: string;
    last_name: string | null;
    phone: string;
    email: string | null;
    company: string | null;
    status: LeadStatus;
    notes: string | null;
    source: string | null;
    optimal_call_hour: number | null;
    optimal_call_day: number | null;
    pickup_probability: number | null;
    created_at: string;
    updated_at: string;
}

interface LeadWithAssignee extends LeadRow {
    assigned_first_name: string | null;
    assigned_last_name: string | null;
    call_count: number;
}

interface CreateLeadData {
    org_id: string;
    assigned_to?: string;
    first_name: string;
    last_name?: string;
    phone: string;
    email?: string;
    company?: string;
    source?: string;
}

export class LeadRepository extends BaseRepository<LeadRow> {
    constructor() {
        super('leads');
    }

    /**
     * Find leads with pagination and filtering
     */
    findLeads(orgId: string, filters: LeadFilters = {}): PaginatedResult<LeadWithAssignee> {
        const { page = 1, limit = 50, status, assignedTo, search } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE l.org_id = ?';
        const params: unknown[] = [orgId];

        if (status) {
            whereClause += ' AND l.status = ?';
            params.push(status);
        }

        if (assignedTo) {
            whereClause += ' AND l.assigned_to = ?';
            params.push(assignedTo);
        }

        if (search) {
            whereClause += ` AND (l.first_name LIKE ? OR l.last_name LIKE ? OR l.phone LIKE ? OR l.company LIKE ?)`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Get data with join
        const leads = query<LeadWithAssignee>(
            `SELECT l.*, 
                u.first_name as assigned_first_name, 
                u.last_name as assigned_last_name,
                (SELECT COUNT(*) FROM calls c WHERE c.lead_id = l.id) as call_count
             FROM leads l
             LEFT JOIN users u ON l.assigned_to = u.id
             ${whereClause}
             ORDER BY l.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Get total count
        const countParams = params.slice(0, params.length); // Same params without limit/offset
        const countResult = queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM leads l ${whereClause}`,
            countParams
        );
        const total = countResult?.count || 0;

        return {
            data: leads,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Find lead by phone number within org
     */
    findByPhone(orgId: string, phone: string): LeadRow | null {
        return queryOne<LeadRow>(
            'SELECT * FROM leads WHERE org_id = ? AND phone = ?',
            [orgId, phone]
        );
    }

    /**
     * Find lead with details
     */
    findWithDetails(leadId: string, orgId: string): LeadWithAssignee | null {
        return this.rawQueryOne<LeadWithAssignee>(
            `SELECT l.*, 
                u.first_name as assigned_first_name, 
                u.last_name as assigned_last_name,
                (SELECT COUNT(*) FROM calls c WHERE c.lead_id = l.id) as call_count
             FROM leads l
             LEFT JOIN users u ON l.assigned_to = u.id
             WHERE l.id = ? AND l.org_id = ?`,
            [leadId, orgId]
        );
    }

    /**
     * Create a new lead
     */
    createLead(data: CreateLeadData): string {
        const id = generateId();
        execute(
            `INSERT INTO leads (id, org_id, assigned_to, first_name, last_name, phone, email, company, source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, data.org_id, data.assigned_to || null, data.first_name, data.last_name || null,
                data.phone, data.email || null, data.company || null, data.source || null]
        );
        return id;
    }

    /**
     * Bulk create leads (for CSV import)
     */
    bulkCreate(leads: CreateLeadData[]): string[] {
        const ids: string[] = [];

        withTransaction(() => {
            for (const lead of leads) {
                const id = this.createLead(lead);
                ids.push(id);
            }
        });

        return ids;
    }

    /**
     * Update lead status
     */
    updateStatus(leadId: string, status: LeadStatus): boolean {
        const result = execute(
            "UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?",
            [status, leadId]
        );
        return result.changes > 0;
    }

    /**
     * Get optimal call time for a lead
     */
    getOptimalCallTime(leadId: string): {
        optimalHour: number | null;
        optimalDay: number | null;
        pickupProbability: number | null;
    } | null {
        const lead = queryOne<{
            optimal_call_hour: number | null;
            optimal_call_day: number | null;
            pickup_probability: number | null;
        }>(
            'SELECT optimal_call_hour, optimal_call_day, pickup_probability FROM leads WHERE id = ?',
            [leadId]
        );

        if (!lead) return null;

        return {
            optimalHour: lead.optimal_call_hour,
            optimalDay: lead.optimal_call_day,
            pickupProbability: lead.pickup_probability,
        };
    }

    /**
     * Update optimal call time prediction
     */
    updateOptimalCallTime(leadId: string, hour: number, day: number, probability: number): void {
        execute(
            `UPDATE leads SET optimal_call_hour = ?, optimal_call_day = ?, pickup_probability = ? WHERE id = ?`,
            [hour, day, probability, leadId]
        );
    }

    /**
     * Convert database row to Lead entity
     */
    static toEntity(row: LeadRow): Lead {
        return {
            id: row.id,
            orgId: row.org_id,
            assignedTo: row.assigned_to || undefined,
            firstName: row.first_name,
            lastName: row.last_name || undefined,
            phone: row.phone,
            email: row.email || undefined,
            company: row.company || undefined,
            status: row.status,
            notes: row.notes || undefined,
            source: row.source || undefined,
            optimalCallHour: row.optimal_call_hour || undefined,
            optimalCallDay: row.optimal_call_day || undefined,
            pickupProbability: row.pickup_probability || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

// Singleton instance
export const leadRepository = new LeadRepository();
