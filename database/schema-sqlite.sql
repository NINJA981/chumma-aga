-- VocalPulse SQLite Schema
-- Simple file-based database - no server required!

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    emp_number TEXT UNIQUE, -- Callyzer Employee Number
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'manager', 'rep')) DEFAULT 'rep',
    is_active INTEGER DEFAULT 1,
    lead_assignment_weight INTEGER DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- LEADS
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    assigned_to TEXT REFERENCES users(id),
    first_name TEXT NOT NULL,
    last_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    company TEXT,
    status TEXT CHECK(status IN ('new', 'contacted', 'qualified', 'converted', 'lost')) DEFAULT 'new',
    notes TEXT,
    source TEXT,
    optimal_call_hour INTEGER,
    optimal_call_day INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ============================================
-- CALLS
-- ============================================
CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    callyzer_id TEXT UNIQUE, -- Callyzer UUID
    org_id TEXT NOT NULL REFERENCES organizations(id),
    rep_id TEXT NOT NULL REFERENCES users(id),
    lead_id TEXT REFERENCES leads(id),
    phone_number TEXT NOT NULL,
    call_type TEXT CHECK(call_type IN ('inbound', 'outbound')) DEFAULT 'outbound',
    call_source TEXT CHECK(call_source IN ('voip', 'sim', 'manual')) DEFAULT 'manual',
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER DEFAULT 0,
    is_answered INTEGER DEFAULT 0,
    disposition TEXT,
    recording_url TEXT,
    transcript TEXT,
    notes TEXT,
    xp_awarded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_calls_org ON calls(org_id);
CREATE INDEX IF NOT EXISTS idx_calls_rep ON calls(rep_id);
CREATE INDEX IF NOT EXISTS idx_calls_lead ON calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_started ON calls(started_at);

-- ============================================
-- CALL ANALYSIS (AI Results)
-- ============================================
CREATE TABLE IF NOT EXISTS call_analysis (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    call_id TEXT UNIQUE NOT NULL REFERENCES calls(id),
    sentiment_score INTEGER CHECK(sentiment_score BETWEEN 1 AND 10),
    sentiment_label TEXT,
    summary TEXT,
    summary_bullets TEXT, -- JSON array stored as text
    action_items TEXT, -- JSON array stored as text
    keywords TEXT, -- JSON array stored as text
    topics TEXT, -- JSON array stored as text
    next_action_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- BATTLECARDS
-- ============================================
CREATE TABLE IF NOT EXISTS battlecards (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT REFERENCES organizations(id),
    objection_pattern TEXT NOT NULL,
    rebuttal TEXT NOT NULL,
    source TEXT CHECK(source IN ('ai_generated', 'manual')) DEFAULT 'ai_generated',
    times_shown INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- REP XP HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS rep_xp_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    rep_id TEXT NOT NULL REFERENCES users(id),
    call_id TEXT REFERENCES calls(id),
    xp_delta INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_xp_rep ON rep_xp_history(rep_id);

-- ============================================
-- LEADERBOARD SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    rep_id TEXT NOT NULL REFERENCES users(id),
    rank INTEGER NOT NULL,
    total_xp INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- FOLLOWUPS
-- ============================================
CREATE TABLE IF NOT EXISTS followups (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    rep_id TEXT NOT NULL REFERENCES users(id),
    lead_id TEXT REFERENCES leads(id),
    call_id TEXT REFERENCES calls(id),
    due_date TEXT NOT NULL,
    description TEXT,
    is_completed INTEGER DEFAULT 0,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_followups_rep ON followups(rep_id);
CREATE INDEX IF NOT EXISTS idx_followups_due ON followups(due_date);

-- ============================================
-- CSV IMPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS csv_imports (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    total_rows INTEGER DEFAULT 0,
    imported_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    assignment_mode TEXT CHECK(assignment_mode IN ('round_robin', 'weighted')) DEFAULT 'round_robin',
    status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    error_log TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);
