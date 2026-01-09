-- VocalPulse Database Schema
-- PostgreSQL Database for Call Tracking & AI Intelligence

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORGANIZATIONS (Multi-tenant)
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USERS (Reps & Managers)
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'rep');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'rep',
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    assignment_weight INTEGER DEFAULT 1, -- For weighted lead assignment
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- LEADS
-- ============================================
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Contact Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    company VARCHAR(255),
    
    -- Lead Data
    status lead_status DEFAULT 'new',
    source VARCHAR(100),
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    -- AI Analytics
    optimal_call_hour INTEGER, -- 0-23 best hour to call
    optimal_call_day INTEGER,  -- 0-6 best day to call
    pickup_probability DECIMAL(5,2), -- Predicted pickup rate
    
    -- Timestamps
    last_contacted_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_org ON leads(org_id);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_phone ON leads(phone);

-- ============================================
-- CALLS
-- ============================================
CREATE TYPE call_type AS ENUM ('outbound', 'inbound');
CREATE TYPE call_source AS ENUM ('voip', 'sim', 'manual');
CREATE TYPE call_disposition AS ENUM (
    'connected', 'no_answer', 'busy', 'voicemail', 
    'wrong_number', 'callback_scheduled', 'converted', 'not_interested'
);

CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Call Metadata
    call_type call_type DEFAULT 'outbound',
    call_source call_source DEFAULT 'sim',
    phone_number VARCHAR(20) NOT NULL,
    
    -- Timing
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0,
    ring_duration_seconds INTEGER DEFAULT 0,
    
    -- Outcome
    disposition call_disposition,
    is_answered BOOLEAN DEFAULT false,
    notes TEXT,
    
    -- Recording
    recording_url VARCHAR(500),
    transcript TEXT,
    
    -- Ghost-Sync flag
    synced_via_ghost BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calls_org ON calls(org_id);
CREATE INDEX idx_calls_rep ON calls(rep_id);
CREATE INDEX idx_calls_lead ON calls(lead_id);
CREATE INDEX idx_calls_started ON calls(started_at);
CREATE INDEX idx_calls_disposition ON calls(disposition);

-- ============================================
-- AI ANALYSIS (Conversation DNA)
-- ============================================
CREATE TABLE call_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    
    -- Sentiment
    sentiment_score INTEGER CHECK (sentiment_score >= 1 AND sentiment_score <= 10),
    sentiment_label VARCHAR(50), -- 'angry', 'neutral', 'delighted'
    sentiment_reasoning TEXT,
    
    -- Summary
    summary_bullets TEXT[], -- Array of 3 bullet points
    full_summary TEXT,
    
    -- Action Items
    action_items JSONB DEFAULT '[]', -- [{text, due_date, calendar_created}]
    
    -- Keywords & Topics
    keywords TEXT[],
    topics TEXT[],
    
    -- Processing Info
    processed_at TIMESTAMP DEFAULT NOW(),
    model_version VARCHAR(50)
);

CREATE INDEX idx_analysis_call ON call_analysis(call_id);

-- ============================================
-- BATTLECARDS (AI Rebuttals)
-- ============================================
CREATE TABLE battlecards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Trigger
    objection_pattern VARCHAR(500) NOT NULL, -- e.g., "too expensive"
    objection_keywords TEXT[],
    
    -- Response
    rebuttal_text TEXT NOT NULL,
    rebuttal_type VARCHAR(50), -- 'price', 'timing', 'competitor', 'feature'
    
    -- Usage Stats
    times_shown INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    
    -- AI Generated flag
    is_ai_generated BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_battlecards_org ON battlecards(org_id);

-- ============================================
-- REP XP & LEADERBOARD
-- ============================================
CREATE TABLE rep_xp_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rep_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    xp_delta INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'call', 'conversion', 'missed_followup', 'talk_time'
    reference_id UUID, -- call_id or lead_id
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_xp_rep ON rep_xp_history(rep_id);
CREATE INDEX idx_xp_created ON rep_xp_history(created_at);

CREATE TABLE leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    rankings JSONB NOT NULL, -- [{rep_id, rank, xp, calls, conversions}]
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snapshot_org_date ON leaderboard_snapshots(org_id, snapshot_date);

-- ============================================
-- LEAD CONTACT HISTORY (For Heatmap)
-- ============================================
CREATE TABLE lead_contact_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    
    attempt_hour INTEGER NOT NULL, -- 0-23
    attempt_day INTEGER NOT NULL,  -- 0-6 (Sun-Sat)
    was_answered BOOLEAN NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contact_lead ON lead_contact_attempts(lead_id);
CREATE INDEX idx_contact_hour_day ON lead_contact_attempts(attempt_hour, attempt_day);

-- ============================================
-- FOLLOW-UPS & CALENDAR
-- ============================================
CREATE TABLE followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    rep_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_at TIMESTAMP NOT NULL,
    
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    
    -- AI Extraction source
    extracted_from_ai BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_followups_rep ON followups(rep_id);
CREATE INDEX idx_followups_due ON followups(due_at);
CREATE INDEX idx_followups_incomplete ON followups(rep_id) WHERE is_completed = false;

-- ============================================
-- CSV IMPORTS
-- ============================================
CREATE TABLE csv_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    
    filename VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL,
    imported_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    
    assignment_mode VARCHAR(20) DEFAULT 'round_robin', -- 'round_robin', 'weighted'
    
    status VARCHAR(20) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    error_log JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_battlecards_updated_at
    BEFORE UPDATE ON battlecards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Rep performance summary
CREATE VIEW rep_performance AS
SELECT 
    u.id as rep_id,
    u.org_id,
    u.first_name || ' ' || u.last_name as rep_name,
    COUNT(c.id) as total_calls,
    COUNT(c.id) FILTER (WHERE c.is_answered) as answered_calls,
    COALESCE(SUM(c.duration_seconds), 0) as total_talk_seconds,
    COALESCE(AVG(c.duration_seconds) FILTER (WHERE c.is_answered), 0) as avg_call_duration,
    COUNT(c.id) FILTER (WHERE c.disposition = 'converted') as conversions
FROM users u
LEFT JOIN calls c ON c.rep_id = u.id AND c.started_at > NOW() - INTERVAL '30 days'
WHERE u.role = 'rep'
GROUP BY u.id;

-- Hourly heatmap data
CREATE VIEW call_heatmap AS
SELECT 
    org_id,
    EXTRACT(DOW FROM started_at) as day_of_week,
    EXTRACT(HOUR FROM started_at) as hour_of_day,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE is_answered) as answered,
    ROUND(COUNT(*) FILTER (WHERE is_answered)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) as pickup_rate
FROM calls
WHERE started_at > NOW() - INTERVAL '90 days'
GROUP BY org_id, day_of_week, hour_of_day;
