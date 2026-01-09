/**
 * Data Transfer Objects (DTOs) for API requests/responses
 */

import { LeadStatus, CallType, CallSource, CallDisposition, AssignmentMode } from './index.js';

// Auth DTOs
export interface RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    orgName?: string;
    orgId?: string;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        orgId: string;
    };
}

// Lead DTOs
export interface CreateLeadDto {
    firstName: string;
    lastName?: string;
    email?: string;
    phone: string;
    company?: string;
    source?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
}

export interface UpdateLeadDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    status?: LeadStatus;
    notes?: string;
    assignedTo?: string;
}

export interface LeadImportDto {
    file: Buffer;
    mode: AssignmentMode;
}

export interface ImportResult {
    importId: string;
    totalRows: number;
    importedRows: number;
    failedRows: number;
    errors: string[];
}

// Call DTOs
export interface CreateCallDto {
    leadId?: string;
    phoneNumber: string;
    callType?: CallType;
    callSource?: CallSource;
    startedAt: string;
    endedAt?: string;
    durationSeconds: number;
    ringDurationSeconds?: number;
    isAnswered?: boolean;
    disposition?: CallDisposition;
    notes?: string;
    recordingUrl?: string;
}

export interface GhostSyncDto {
    phoneNumber: string;
    callType: CallType;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
}

export interface UpdateDispositionDto {
    disposition: CallDisposition;
    notes?: string;
}

// AI DTOs
export interface AnalyzeCallDto {
    callId: string;
    audioUrl?: string;
    transcript?: string;
}

export interface AnalysisResult {
    callId: string;
    analysis: {
        sentimentScore: number;
        sentimentLabel: string;
        summaryBullets: string[];
        actionItems: ActionItem[];
    };
}

export interface ActionItem {
    text: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
}

export interface BattlecardRequest {
    objection: string;
    context?: string;
}

export interface BattlecardResponse {
    battlecard: {
        id: string;
        rebuttal: string;
        source: 'cached' | 'ai_generated';
    };
}

// Analytics DTOs
export interface AnalyticsQuery {
    period?: '7d' | '30d' | '90d';
}

export interface WarRoomData {
    todayCalls: number;
    todayConversions: number;
    recentActivity: RecentActivity[];
    activeReps: ActiveRep[];
}

export interface RecentActivity {
    id: string;
    repName: string;
    leadName: string;
    disposition: string;
    duration: number;
    time: string;
}

export interface ActiveRep {
    id: string;
    firstName: string;
    lastName: string;
}

// Leaderboard DTOs
export interface RepLeaderboardStats {
    repId: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    xp: number;
    rank: number | null;
    totalCalls: number;
    answeredCalls: number;
    talkMinutes: number;
    conversions: number;
    conversionRatio: number;
    aiCoachingTip?: string | null;
}
