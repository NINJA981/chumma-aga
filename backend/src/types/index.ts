/**
 * Core Entity Interfaces for VocalPulse
 */

// Organization
export interface Organization {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
}

// User
export interface User {
    id: string;
    orgId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    leadAssignmentWeight: number;
    avatarUrl?: string;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}

export type UserRole = 'admin' | 'manager' | 'rep';

export interface AuthUser {
    id: string;
    orgId: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
}

// Lead
export interface Lead {
    id: string;
    orgId: string;
    assignedTo?: string;
    firstName: string;
    lastName?: string;
    phone: string;
    email?: string;
    company?: string;
    status: LeadStatus;
    notes?: string;
    source?: string;
    optimalCallHour?: number;
    optimalCallDay?: number;
    pickupProbability?: number;
    createdAt: string;
    updatedAt: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

// Call
export interface Call {
    id: string;
    orgId: string;
    repId: string;
    leadId?: string;
    phoneNumber: string;
    callType: CallType;
    callSource: CallSource;
    startedAt: string;
    endedAt?: string;
    durationSeconds: number;
    ringDurationSeconds?: number;
    isAnswered: boolean;
    disposition?: CallDisposition;
    recordingUrl?: string;
    transcript?: string;
    notes?: string;
    xpAwarded: number;
    syncedViaGhost: boolean;
    createdAt: string;
}

export type CallType = 'inbound' | 'outbound';
export type CallSource = 'voip' | 'sim' | 'manual';
export type CallDisposition =
    | 'no_answer'
    | 'busy'
    | 'voicemail'
    | 'callback_requested'
    | 'not_interested'
    | 'qualified'
    | 'converted';

// Call Analysis (AI Results)
export interface CallAnalysis {
    id: string;
    callId: string;
    sentimentScore: number;
    sentimentLabel: string;
    sentimentReasoning?: string;
    summary?: string;
    summaryBullets?: string;
    fullSummary?: string;
    actionItems?: string;
    keywords?: string;
    topics?: string;
    modelVersion: string;
    createdAt: string;
}

// Battlecard
export interface Battlecard {
    id: string;
    orgId: string;
    objectionPattern: string;
    rebuttalText: string;
    rebuttalType?: string;
    timesShown: number;
    successRate?: number;
    isAiGenerated: boolean;
    createdAt: string;
}

// XP History
export interface RepXpHistory {
    id: string;
    repId: string;
    callId?: string;
    xpDelta: number;
    reason?: string;
    createdAt: string;
}

// Leaderboard Snapshot
export interface LeaderboardSnapshot {
    id: string;
    orgId: string;
    repId: string;
    rank: number;
    totalXp: number;
    snapshotDate: string;
    createdAt: string;
}

// Followup
export interface Followup {
    id: string;
    orgId: string;
    repId: string;
    leadId?: string;
    callId?: string;
    title?: string;
    dueAt: string;
    description?: string;
    isCompleted: boolean;
    completedAt?: string;
    extractedFromAi: boolean;
    createdAt: string;
}

// CSV Import
export interface CsvImport {
    id: string;
    orgId: string;
    uploadedBy: string;
    filename: string;
    totalRows: number;
    importedRows: number;
    failedRows: number;
    assignmentMode: AssignmentMode;
    status: ImportStatus;
    errorLog?: string;
    createdAt: string;
    completedAt?: string;
}

export type AssignmentMode = 'round_robin' | 'weighted';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Pagination
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Filters
export interface LeadFilters {
    status?: LeadStatus;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CallFilters {
    repId?: string;
    leadId?: string;
    startDate?: string;
    endDate?: string;
    isAnswered?: boolean;
    page?: number;
    limit?: number;
}

// Analytics Types
export interface TeamAnalytics {
    summary: {
        totalCalls: number;
        answeredCalls: number;
        totalTalkSeconds: number;
        conversions: number;
        connectRate: number;
    };
    reps: RepStats[];
    dailyTrend: DailyStats[];
    period: number;
}

export interface RepStats {
    id: string;
    firstName: string;
    lastName: string;
    totalCalls: number;
    answeredCalls: number;
    totalTalkSeconds: number;
    conversions: number;
    avgDuration: number;
}

export interface DailyStats {
    date: string;
    calls: number;
    answered: number;
    conversions: number;
}

export interface HeatmapData {
    grid: number[][];
    attempts: number[][];
    bestTimes: { day: number; hour: number; rate: number }[];
    days: string[];
    hours: string[];
}

// Leaderboard
export interface LeaderboardEntry {
    repId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    xp: number;
    rank: number;
    totalCalls?: number;
    conversions?: number;
}

// Re-export WarRoomData and RepLeaderboardStats for services
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
