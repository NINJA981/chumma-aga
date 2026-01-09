export interface CallPayload {
    call_type: 'Incoming' | 'Outgoing' | 'Missed' | 'Rejected';
    call_duration: string; // "00:02:30"
    call_start_time: string;
    call_end_time?: string;
    from_number: string;
    to_number: string;
    caller_name?: string;
    agent_id?: string;
    recording_url?: string;
}

export interface Lead {
    id: string;
    name: string;
    phone: string;
    location?: string;
    status: 'New' | 'Interested' | 'Follow Up' | 'Converted' | 'Lost';
    notes?: string;
    lastContact?: string;
    tags?: string[];
}

export interface DashboardStats {
    totalCalls: number;
    totalTalkTime: number; // in seconds
    missedCalls: number;
    convertedLeads: number;
    revenueLeakage: number; // Estimated value
}

export interface Agent {
    id: string;
    name: string;
    email: string;
    status: 'Available' | 'On Call' | 'Break' | 'Offline';
    avatar?: string;
}
