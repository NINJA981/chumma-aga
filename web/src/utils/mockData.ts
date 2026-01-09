export const mockLeads = [
    {
        id: '1',
        name: 'Rajesh Kumar',
        phone: '+91-98765-43210',
        location: 'Mumbai, Maharashtra',
        status: 'Interested',
        notes: 'Customer asked for a discount in Hindi. Works in Textile industry.',
        lastContact: '2026-01-09T10:30:00',
        timeline: [
            { type: 'call', direction: 'incoming', duration: 120, summary: 'Discussed pricing for bulk order.', timestamp: '2026-01-09T10:30:00' },
            { type: 'sms', direction: 'outgoing', content: 'Shared brochure via WhatsApp.', timestamp: '2026-01-08T15:00:00' }
        ]
    },
    {
        id: '2',
        name: 'Nitin Gadkari',
        phone: '+91-99887-76655',
        location: 'Nagpur, Maharashtra',
        status: 'New',
        notes: 'Real Estate developer. Looking for CRM for 50 agents.',
        lastContact: '2026-01-09T09:15:00',
        timeline: [
            { type: 'call', direction: 'outgoing', duration: 0, summary: 'Missed call.', timestamp: '2026-01-09T09:15:00' }
        ]
    },
    {
        id: '3',
        name: 'Vikram Singh',
        phone: '+91-88776-65544',
        location: 'Kolkata, West Bengal',
        status: 'Converted',
        notes: 'Follow up after Pongal/Diwali holidays. Loves the "Tactile" UI.',
        lastContact: '2026-01-08T18:45:00',
        timeline: [
            { type: 'call', direction: 'incoming', duration: 450, summary: 'Finalized deal. Sent invoice.', timestamp: '2026-01-08T18:45:00' }
        ]
    },
    {
        id: '4',
        name: 'Sita Raman',
        phone: '+91-77665-54433',
        location: 'Chennai, Tamil Nadu',
        status: 'Follow Up',
        notes: 'Lead prefers WhatsApp over direct call. Fluent in English and Tamil.',
        lastContact: '2026-01-09T11:00:00',
        timeline: [
            { type: 'message', direction: 'incoming', content: 'Can you call me at 4 PM?', timestamp: '2026-01-09T11:00:00' }
        ]
    }
];

export const mockDashboardStats = {
    teamEnergy: {
        totalTalkTime: '45h 30m',
        trend: '+12%',
        status: 'High Energy'
    },
    revenueLeakage: {
        missedCalls: 7, // > 5 to trigger "Red Alert"
        potentialLoss: '₹2.5L',
        details: '7 High-value leads missed this morning.'
    },
    activeAgents: [
        { name: 'Arjun Mehta', status: 'On Call', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun' },
        { name: 'Priya Sharma', status: 'Available', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya' },
        { name: 'Suresh Iyer', status: 'Break', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh' },
        { name: 'Ananya Das', status: 'On Call', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya' }
    ]
};

export const warRoomFeed = [
    {
        id: 'c1',
        agent: 'Arjun Mehta',
        lead: 'Rajesh Kumar',
        status: 'Completed',
        duration: '5m 30s',
        summary: 'Rajesh was busy, call him after 4 PM.',
        timestamp: 'Just now'
    },
    {
        id: 'c2',
        agent: 'Priya Sharma',
        lead: 'New Inquiry',
        status: 'Incoming',
        duration: '00:00',
        summary: 'Incoming call from +91-98765-XXXXX...',
        timestamp: 'Live'
    },
    {
        id: 'c3',
        agent: 'Ananya Das',
        lead: 'Vikram Singh',
        status: 'Missed',
        duration: '00:00',
        summary: 'Missed call from High Priority Lead!',
        timestamp: '2 mins ago'
    }
];
