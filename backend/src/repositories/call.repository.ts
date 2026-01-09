/**
 * Call Repository - Data access for calls
 */

import { BaseRepository, query, queryOne, execute, generateId, pgToSqlite } from './base.repository.js';
import type { Call, CallType, CallSource, CallDisposition, CallFilters } from '../types/index.js';

interface CallRow {
    id: string;
    org_id: string;
    rep_id: string;
    lead_id: string | null;
    phone_number: string;
    call_type: CallType;
    call_source: CallSource;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number;
    ring_duration_seconds: number | null;
    is_answered: number;
    disposition: CallDisposition | null;
    recording_url: string | null;
    transcript: string | null;
    notes: string | null;
    xp_awarded: number;
    synced_via_ghost: number;
    created_at: string;
}

interface CallWithDetails extends CallRow {
    lead_first_name: string | null;
    lead_last_name: string | null;
    rep_first_name: string;
    rep_last_name: string;
}

interface CreateCallData {
    org_id: string;
    rep_id: string;
    lead_id?: string;
    phone_number: string;
    call_type?: CallType;
    call_source?: CallSource;
    started_at: string;
    ended_at?: string;
    duration_seconds: number;
    ring_duration_seconds?: number;
    is_answered?: boolean;
    disposition?: CallDisposition;
    recording_url?: string;
    notes?: string;
    synced_via_ghost?: boolean;
}

export class CallRepository extends BaseRepository<CallRow> {
    constructor() {
        super('calls');
    }

    /**
     * Create a new call record
     */
    createCall(data: CreateCallData): string {
        const id = generateId();
        execute(
            `INSERT INTO calls (
                id, org_id, rep_id, lead_id, phone_number, call_type, call_source,
                started_at, ended_at, duration_seconds, ring_duration_seconds,
                disposition, is_answered, notes, recording_url, synced_via_ghost
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, data.org_id, data.rep_id, data.lead_id || null, data.phone_number,
                data.call_type || 'outbound', data.call_source || 'manual',
                data.started_at, data.ended_at || null, data.duration_seconds,
                data.ring_duration_seconds || null, data.disposition || null,
                data.is_answered ? 1 : 0, data.notes || null, data.recording_url || null,
                data.synced_via_ghost ? 1 : 0
            ]
        );
        return id;
    }

    /**
     * Find call with lead and rep details
     */
    findWithDetails(callId: string, orgId: string): CallWithDetails | null {
        return this.rawQueryOne<CallWithDetails>(
            `SELECT c.*, 
                l.first_name as lead_first_name, l.last_name as lead_last_name,
                u.first_name as rep_first_name, u.last_name as rep_last_name
             FROM calls c
             LEFT JOIN leads l ON c.lead_id = l.id
             JOIN users u ON c.rep_id = u.id
             WHERE c.id = ? AND c.org_id = ?`,
            [callId, orgId]
        );
    }

    /**
     * Find calls by rep with date range
     */
    findByRepId(repId: string, startDate?: string, endDate?: string): CallRow[] {
        let sql = 'SELECT * FROM calls WHERE rep_id = ?';
        const params: unknown[] = [repId];

        if (startDate) {
            sql += ' AND started_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND started_at <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY started_at DESC';

        return query<CallRow>(sql, params);
    }

    /**
     * Get rep stats for a period
     */
    getRepStats(repId: string, days: number = 30): {
        total_calls: number;
        answered_calls: number;
        total_talk_seconds: number;
        conversions: number;
    } | null {
        return this.rawQueryOne<{
            total_calls: number;
            answered_calls: number;
            total_talk_seconds: number;
            conversions: number;
        }>(
            `SELECT 
                COUNT(*) as total_calls,
                SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) as answered_calls,
                COALESCE(SUM(duration_seconds), 0) as total_talk_seconds,
                SUM(CASE WHEN disposition = 'converted' THEN 1 ELSE 0 END) as conversions
             FROM calls
             WHERE rep_id = ? AND started_at > datetime('now', '-${days} days')`,
            [repId]
        );
    }

    /**
     * Get today's calls for an org
     */
    getTodayStats(orgId: string): { total_calls: number; conversions: number } {
        const result = this.rawQueryOne<{ total_calls: number; conversions: number }>(
            `SELECT 
                COUNT(*) as total_calls,
                SUM(CASE WHEN disposition = 'converted' THEN 1 ELSE 0 END) as conversions
             FROM calls
             WHERE org_id = ? AND date(started_at) = date('now')`,
            [orgId]
        );
        return result || { total_calls: 0, conversions: 0 };
    }

    /**
     * Get recent activity for war room
     */
    getRecentActivity(orgId: string, limit: number = 10): Array<{
        id: string;
        rep_first_name: string;
        rep_last_name: string;
        lead_first_name: string | null;
        lead_last_name: string | null;
        disposition: string | null;
        duration_seconds: number;
        started_at: string;
    }> {
        return this.rawQuery(
            `SELECT c.id, c.disposition, c.duration_seconds, c.started_at,
                u.first_name as rep_first_name, u.last_name as rep_last_name,
                l.first_name as lead_first_name, l.last_name as lead_last_name
             FROM calls c
             JOIN users u ON c.rep_id = u.id
             LEFT JOIN leads l ON c.lead_id = l.id
             WHERE c.org_id = ?
             ORDER BY c.started_at DESC
             LIMIT ?`,
            [orgId, limit]
        );
    }

    /**
     * Update call disposition
     */
    updateDisposition(callId: string, orgId: string, disposition: CallDisposition, notes?: string): boolean {
        const result = execute(
            'UPDATE calls SET disposition = ?, notes = ? WHERE id = ? AND org_id = ?',
            [disposition, notes || null, callId, orgId]
        );
        return result.changes > 0;
    }

    /**
     * Get call heatmap data
     */
    getHeatmapData(orgId: string, days: number = 90): Array<{
        day_of_week: number;
        hour_of_day: number;
        total_attempts: number;
        answered: number;
        pickup_rate: number;
    }> {
        return this.rawQuery(
            `SELECT 
                CAST(strftime('%w', started_at) AS INTEGER) as day_of_week,
                CAST(strftime('%H', started_at) AS INTEGER) as hour_of_day,
                COUNT(*) as total_attempts,
                SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) as answered,
                ROUND(SUM(CASE WHEN is_answered = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as pickup_rate
             FROM calls
             WHERE org_id = ? AND started_at > datetime('now', '-${days} days')
             GROUP BY day_of_week, hour_of_day
             ORDER BY day_of_week, hour_of_day`,
            [orgId]
        );
    }

    /**
     * Convert database row to Call entity
     */
    static toEntity(row: CallRow): Call {
        return {
            id: row.id,
            orgId: row.org_id,
            repId: row.rep_id,
            leadId: row.lead_id || undefined,
            phoneNumber: row.phone_number,
            callType: row.call_type,
            callSource: row.call_source,
            startedAt: row.started_at,
            endedAt: row.ended_at || undefined,
            durationSeconds: row.duration_seconds,
            ringDurationSeconds: row.ring_duration_seconds || undefined,
            isAnswered: row.is_answered === 1,
            disposition: row.disposition || undefined,
            recordingUrl: row.recording_url || undefined,
            transcript: row.transcript || undefined,
            notes: row.notes || undefined,
            xpAwarded: row.xp_awarded,
            syncedViaGhost: row.synced_via_ghost === 1,
            createdAt: row.created_at,
        };
    }
}

// Singleton instance
export const callRepository = new CallRepository();
