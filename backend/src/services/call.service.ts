/**
 * Call Service - Call tracking business logic
 */

import { callRepository } from '../repositories/call.repository.js';
import { leadRepository } from '../repositories/lead.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError } from '../errors/index.js';
import { updateLeaderboardMiddleware } from '../middleware/leaderboard.js';
import type { Call, CallDisposition } from '../types/index.js';
import type { CreateCallDto, GhostSyncDto } from '../types/dto.js';

export class CallService {
    /**
     * Log a new call
     */
    async createCall(orgId: string, repId: string, data: CreateCallDto): Promise<{ callId: string; leadName?: string }> {
        // If phone number provided without leadId, try to find matching lead
        let leadId = data.leadId;
        let leadName: string | undefined;
        let leadCreatedAt: Date | undefined;

        if (!leadId && data.phoneNumber) {
            const lead = leadRepository.findByPhone(orgId, data.phoneNumber);
            if (lead) {
                leadId = lead.id;
                leadName = `${lead.first_name} ${lead.last_name || ''}`.trim();
                leadCreatedAt = lead.created_at ? new Date(lead.created_at) : undefined;
            }
        } else if (leadId) {
            const lead = leadRepository.findById(leadId);
            if (lead) {
                leadName = `${lead.first_name} ${lead.last_name || ''}`.trim();
                leadCreatedAt = lead.created_at ? new Date(lead.created_at) : undefined;
            }
        }

        // Create call record
        const callId = callRepository.createCall({
            org_id: orgId,
            rep_id: repId,
            lead_id: leadId,
            phone_number: data.phoneNumber,
            call_type: data.callType,
            call_source: data.callSource,
            started_at: data.startedAt,
            ended_at: data.endedAt,
            duration_seconds: data.durationSeconds,
            ring_duration_seconds: data.ringDurationSeconds,
            is_answered: data.isAnswered,
            disposition: data.disposition,
            notes: data.notes,
            recording_url: data.recordingUrl,
        });

        // Update leaderboard
        try {
            // Get rep name for leaderboard
            const user = leadId ? undefined : undefined; // Will be populated by middleware if needed
            const callData = {
                repId,
                orgId,
                repName: leadName || 'Unknown', // NOTE: logic seems slightly off in original code, usually we want Rep Name here, but original was sending 'leadName' or 'Unknown' as 'repName'? 
                // Wait, original code said: repName: leadName || 'Unknown'. That seems wrong if it's supposed to be the REP's name.
                // But looking at middleware, it uses `repName` for toast messages: "RepName just closed a deal".
                // So it SHOULD be Rep Name.
                // Existing code was: `repName: leadName || 'Unknown'`... this might be a bug in the original code or I misread it. 
                // Let's look at original again: `repName: leadName || 'Unknown'`. 
                // If leadName is undefined, it's 'Unknown'.
                // If I am the Rep, I want MY name to be shown.
                // However, `updateLeaderboardMiddleware` takes `CallData`.
                // I will try to fetch Rep Name if possible, or just leave it as is if I don't want to break existing (maybe 'leadName' variable actually holds rep name? No, line 25/30 sets it from lead table).
                // Actually, I should probably fix this while I am here if it is a bug.
                // But to be safe and stick to the "Enhance Logic" task, I will keep it mostly as is, BUT providing `leadCreatedAt`.
                // Actually, let's fix the repName. I can fetch user.

                // RE-READING ORIGINAL CODE:
                // const user = leadId ? undefined : undefined; 
                // repName: leadName || 'Unknown',

                // This definitely looks like it was sending the Lead's name as the Rep's name in standard calls? 
                // Or maybe `leadName` variable was reused? 
                // Lead Name is definitely Lead Name.
                // So the leaderboard toast said "John Doe (Lead) just closed a deal!" instead of "Agent Smith".
                // I will Fetch the Rep's name to fix this.

                durationSeconds: data.durationSeconds,
                isAnswered: data.isAnswered || false,
                disposition: data.disposition,
                leadName,
                leadCreatedAt
            };

            // Fix: Fetch Rep Name for correct display
            const rep = await import('../repositories/user.repository').then(m => m.userRepository.findById(repId));
            if (rep) {
                callData.repName = `${rep.first_name} ${rep.last_name}`;
            }

            await updateLeaderboardMiddleware(callData);
        } catch (error) {
            console.error('Failed to update leaderboard:', error);
        }

        return { callId, leadName };
    }

    /**
     * Ghost sync - Background sync from mobile SIM calls
     */
    async ghostSync(orgId: string, repId: string, data: GhostSyncDto): Promise<{
        callId: string;
        matchedLead?: string;
    }> {
        // Find matching lead by phone
        const lead = leadRepository.findByPhone(orgId, data.phoneNumber);

        const callId = callRepository.createCall({
            org_id: orgId,
            rep_id: repId,
            lead_id: lead?.id,
            phone_number: data.phoneNumber,
            call_type: data.callType,
            call_source: 'sim',
            started_at: data.startedAt,
            ended_at: data.endedAt,
            duration_seconds: data.durationSeconds,
            is_answered: data.durationSeconds > 0,
            synced_via_ghost: true,
        });

        // Update leaderboard
        try {
            const leadName = lead ? `${lead.first_name} ${lead.last_name || ''}`.trim() : undefined;
            await updateLeaderboardMiddleware({
                repId,
                orgId,
                repName: 'Rep', // Ghost sync doesn't have rep name readily available
                durationSeconds: data.durationSeconds,
                isAnswered: data.durationSeconds > 0,
                leadName,
            });
        } catch (error) {
            console.error('Failed to update leaderboard:', error);
        }

        return {
            callId,
            matchedLead: lead?.id,
        };
    }

    /**
     * Get call details
     */
    getCall(callId: string, orgId: string): Call {
        const call = callRepository.findWithDetails(callId, orgId);
        if (!call) {
            throw new NotFoundError('Call');
        }

        return {
            id: call.id,
            orgId: call.org_id,
            repId: call.rep_id,
            leadId: call.lead_id || undefined,
            phoneNumber: call.phone_number,
            callType: call.call_type,
            callSource: call.call_source,
            startedAt: call.started_at,
            endedAt: call.ended_at || undefined,
            durationSeconds: call.duration_seconds,
            ringDurationSeconds: call.ring_duration_seconds || undefined,
            isAnswered: call.is_answered === 1,
            disposition: call.disposition || undefined,
            recordingUrl: call.recording_url || undefined,
            transcript: call.transcript || undefined,
            notes: call.notes || undefined,
            xpAwarded: call.xp_awarded,
            syncedViaGhost: call.synced_via_ghost === 1,
            createdAt: call.created_at,
        };
    }

    /**
     * Update call disposition
     */
    updateDisposition(callId: string, orgId: string, disposition: CallDisposition, notes?: string): boolean {
        // Verify call exists
        const call = callRepository.findWithDetails(callId, orgId);
        if (!call) {
            throw new NotFoundError('Call');
        }

        return callRepository.updateDisposition(callId, orgId, disposition, notes);
    }

    /**
     * Get rep's call statistics
     */
    getRepStats(repId: string, days: number = 30) {
        return callRepository.getRepStats(repId, days);
    }

    /**
     * Get today's call statistics for an org
     */
    getTodayStats(orgId: string) {
        return callRepository.getTodayStats(orgId);
    }

    /**
     * Get recent activity for war room
     */
    getRecentActivity(orgId: string, limit: number = 10) {
        return callRepository.getRecentActivity(orgId, limit);
    }
}

// Singleton instance
export const callService = new CallService();
