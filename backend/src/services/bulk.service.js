
import { queryOne, execute } from '../config/database.js';
import axios from 'axios';
import { parse } from 'csv-parse/sync';

/**
 * Handle Bulk Upload and Sync to Callyzer
 */
export const processBulkUpload = async (fileBuffer, orgId, userId) => {
    try {
        // 1. Parse CSV
        const records = parse(fileBuffer, {
            columns: true,
            skip_empty_lines: true
        });

        // Expected columns: name, phone, email (optional)

        const callyzerLeads = [];
        const syncedCount = 0;

        // 2. Iterate and Save to Local DB + Prepare for Callyzer
        for (const record of records) {
            if (!record.phone || !record.name) continue;

            // Simple first name / last name split
            const parts = record.name.split(' ');
            const firstName = parts[0];
            const lastName = parts.slice(1).join(' ') || '';

            // Assign to uploading user (or logic for round robin)
            // Ideally we get 'assigned_to_email' in CSV or assign to upload user
            const assignedId = userId;

            // Check duplicate
            let lead = queryOne('SELECT id FROM leads WHERE phone = ? AND org_id = ?', [record.phone, orgId]);

            if (!lead) {
                // Create Lead
                execute(`
                    INSERT INTO leads (
                        id, org_id, assigned_to, first_name, last_name, phone, email, source, status
                    ) VALUES (
                        lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, 'bulk_upload', 'new'
                    )
                `, [orgId, assignedId, firstName, lastName, record.phone, record.email || null]);
            }

            // Prepare for Callyzer
            // Need the assigned user's Emp Number to sync to their phone
            const user = queryOne('SELECT emp_number FROM users WHERE id = ?', [assignedId]);
            if (user && user.emp_number) {
                callyzerLeads.push({
                    name: record.name,
                    number: record.phone,
                    emp_number: user.emp_number,
                    // email: record.email
                });
            }
        }

        // 3. Push to Callyzer API
        if (callyzerLeads.length > 0) {
            // Callyzer /lead/save is usually one by one or they might have a bulk endpoint.
            // Prompt says: "hit Callyzer’s POST /lead/bulk-save"
            // Assuming such validation exists or we loop.

            // If API supports bulk:
            await axios.post('https://api.callyzer.co/v2/lead/bulk-save', {
                leads: callyzerLeads
            }, {
                headers: { 'Authorization': `Bearer ${process.env.CALLYZER_API_KEY}` }
            });
        }

        return { success: true, count: records.length, synced: callyzerLeads.length };

    } catch (error) {
        console.error('Bulk Upload Error:', error);
        throw error;
    }
};
