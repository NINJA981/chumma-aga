/**
 * Lead Service - Lead management business logic
 */

import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { leadRepository } from '../repositories/lead.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { generateId, execute, withTransaction } from '../repositories/index.js';
import { NotFoundError, ValidationError } from '../errors/index.js';
import type { Lead, LeadFilters, LeadStatus, AssignmentMode, PaginatedResult } from '../types/index.js';
import type { CreateLeadDto, UpdateLeadDto, ImportResult } from '../types/dto.js';

export class LeadService {
    /**
     * List leads with pagination and filtering
     */
    listLeads(orgId: string, filters: LeadFilters = {}): PaginatedResult<Lead> {
        const result = leadRepository.findLeads(orgId, filters);

        return {
            data: result.data.map(row => ({
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
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                // Extended fields from join
                assignedFirstName: row.assigned_first_name,
                assignedLastName: row.assigned_last_name,
                callCount: row.call_count,
            } as Lead & { assignedFirstName?: string; assignedLastName?: string; callCount?: number })),
            pagination: result.pagination,
        };
    }

    /**
     * Get a single lead by ID
     */
    getLead(leadId: string, orgId: string): Lead {
        const lead = leadRepository.findWithDetails(leadId, orgId);
        if (!lead) {
            throw new NotFoundError('Lead');
        }
        return {
            id: lead.id,
            orgId: lead.org_id,
            assignedTo: lead.assigned_to || undefined,
            firstName: lead.first_name,
            lastName: lead.last_name || undefined,
            phone: lead.phone,
            email: lead.email || undefined,
            company: lead.company || undefined,
            status: lead.status,
            notes: lead.notes || undefined,
            source: lead.source || undefined,
            createdAt: lead.created_at,
            updatedAt: lead.updated_at,
        };
    }

    /**
     * Create a new lead
     */
    createLead(orgId: string, data: CreateLeadDto): Lead {
        const leadId = leadRepository.createLead({
            org_id: orgId,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            email: data.email,
            company: data.company,
            source: data.source,
        });

        return this.getLead(leadId, orgId);
    }

    /**
     * Update a lead
     */
    updateLead(leadId: string, orgId: string, data: UpdateLeadDto): Lead {
        const existing = leadRepository.findWithDetails(leadId, orgId);
        if (!existing) {
            throw new NotFoundError('Lead');
        }

        const updateData: Record<string, unknown> = {};
        if (data.firstName !== undefined) updateData.first_name = data.firstName;
        if (data.lastName !== undefined) updateData.last_name = data.lastName;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.company !== undefined) updateData.company = data.company;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;

        if (Object.keys(updateData).length > 0) {
            leadRepository.update(leadId, updateData);
        }

        return this.getLead(leadId, orgId);
    }

    /**
     * Delete a lead
     */
    deleteLead(leadId: string, orgId: string): void {
        const existing = leadRepository.findWithDetails(leadId, orgId);
        if (!existing) {
            throw new NotFoundError('Lead');
        }
        leadRepository.delete(leadId);
    }

    /**
     * Import leads from CSV
     */
    async importCSV(
        orgId: string,
        uploadedBy: string,
        fileBuffer: Buffer,
        filename: string,
        mode: AssignmentMode = 'round_robin'
    ): Promise<ImportResult> {
        // Parse CSV
        const records: Record<string, string>[] = [];
        const parser = Readable.from(fileBuffer).pipe(
            parse({ columns: true, skip_empty_lines: true, trim: true })
        );

        for await (const record of parser) {
            records.push(record);
        }

        if (records.length === 0) {
            throw new ValidationError('CSV file is empty');
        }

        // Create import record
        const importId = generateId();
        execute(
            `INSERT INTO csv_imports (id, org_id, uploaded_by, filename, total_rows, assignment_mode)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [importId, orgId, uploadedBy, filename, records.length, mode]
        );

        // Get reps for assignment
        const reps = userRepository.findRepsByOrgId(orgId);
        if (reps.length === 0) {
            throw new ValidationError('No reps available for lead assignment');
        }

        // Build weighted assignment list if needed
        let weightedReps: string[] = [];
        if (mode === 'weighted') {
            reps.forEach(rep => {
                for (let i = 0; i < rep.lead_assignment_weight; i++) {
                    weightedReps.push(rep.id);
                }
            });
        }

        // Import leads
        let importedRows = 0;
        let failedRows = 0;
        const errors: string[] = [];
        let repIndex = 0;

        withTransaction(() => {
            for (const record of records) {
                try {
                    // Map CSV columns (flexible mapping)
                    const firstName = record.first_name || record.firstName || record.name?.split(' ')[0] || 'Unknown';
                    const lastName = record.last_name || record.lastName || record.name?.split(' ').slice(1).join(' ');
                    const email = record.email || record.Email;
                    const phone = record.phone || record.Phone || record.mobile;
                    const company = record.company || record.Company || record.organization;
                    const source = record.source || 'csv_import';

                    if (!phone) {
                        failedRows++;
                        errors.push(`Row missing phone: ${JSON.stringify(record)}`);
                        continue;
                    }

                    // Assign to rep
                    const assignedTo = mode === 'weighted'
                        ? weightedReps[repIndex % weightedReps.length]
                        : reps[repIndex % reps.length].id;
                    repIndex++;

                    leadRepository.createLead({
                        org_id: orgId,
                        assigned_to: assignedTo,
                        first_name: firstName,
                        last_name: lastName,
                        email,
                        phone,
                        company,
                        source,
                    });

                    importedRows++;
                } catch (error) {
                    failedRows++;
                    errors.push(`Failed to import row: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        });

        // Update import record
        execute(
            `UPDATE csv_imports SET imported_rows = ?, failed_rows = ?, status = 'completed', completed_at = datetime('now')
             WHERE id = ?`,
            [importedRows, failedRows, importId]
        );

        return {
            importId,
            totalRows: records.length,
            importedRows,
            failedRows,
            errors: errors.slice(0, 10), // Limit error messages
        };
    }

    /**
     * Get optimal call time for a lead
     */
    getOptimalCallTime(leadId: string): {
        optimalHour: number | null;
        optimalDay: number | null;
        pickupProbability: number | null;
    } {
        const result = leadRepository.getOptimalCallTime(leadId);
        if (!result) {
            throw new NotFoundError('Lead');
        }
        return result;
    }
}

// Singleton instance
export const leadService = new LeadService();
