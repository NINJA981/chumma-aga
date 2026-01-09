import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Configuration
const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../data/vocalpulse.db');
console.log(`Configured DB Path: ${DB_PATH}`);

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    console.log(`Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
}

// Delete existing database for fresh seed
if (fs.existsSync(DB_PATH)) {
    console.log('🗑️ Deleting existing database for fresh seed...');
    try {
        fs.unlinkSync(DB_PATH);
        // Also remove WAL/SHM files if they exist
        if (fs.existsSync(`${DB_PATH}-wal`)) fs.unlinkSync(`${DB_PATH}-wal`);
        if (fs.existsSync(`${DB_PATH}-shm`)) fs.unlinkSync(`${DB_PATH}-shm`);
    } catch (e) {
        console.warn('Could not delete existing database file:', e);
    }
}

console.log(`🌱 Seeding database at: ${DB_PATH}`);
const db = new Database(DB_PATH);

// Helper to execute SQL
const exec = (sql: string, params: any[] = []) => {
    try {
        return db.prepare(sql).run(...params);
    } catch (error) {
        console.error(`Error executing SQL: ${sql}`, error);
        throw error;
    }
};

const NAMES = [
    { first: 'John', last: 'Doe' },
    { first: 'Jane', last: 'Smith' },
    { first: 'Michael', last: 'Johnson' },
    { first: 'Emily', last: 'Brown' },
    { first: 'David', last: 'Wilson' },
    { first: 'Sarah', last: 'Taylor' },
    { first: 'Robert', last: 'Anderson' },
    { first: 'Jessica', last: 'Thomas' },
    { first: 'William', last: 'Jackson' },
    { first: 'Ashley', last: 'White' },
];

const COMPANIES = [
    'TechCorp', 'InnovateInc', 'FutureSystems', 'CloudNet', 'DataDynamics',
    'CyberShield', 'GreenEnergy', 'HealthPlus', 'EduTech', 'FinanceFlow'
];

const OBJECTIONS = [
    { pattern: 'too expensive', rebuttal: 'We offer flexible payment plans and high ROI.' },
    { pattern: 'not interested', rebuttal: 'I understand, but have you considered the time savings?' },
    { pattern: 'competitor', rebuttal: 'Our solution is 50% faster and includes AI features.' },
    { pattern: 'send email', rebuttal: 'I can certainly do that, but a quick demo would be more effective.' },
];

async function seed() {
    console.log('🏗️ Initializing Schema...');
    const schemaPath = path.join(__dirname, '../../database/schema-sqlite.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        db.exec(schema);
        console.log('✅ Schema initialized');
    } else {
        console.error('❌ Schema file not found at:', schemaPath);
        process.exit(1);
    }

    console.log('🧹 Cleaning up (just in case)...');

    console.log('🏢 Creating Organization...');
    const orgId = uuidv4();
    exec(`INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)`,
        [orgId, 'Demo Corp', 'demo-corp']);

    console.log('👥 Creating Users...');
    const passwordHash = await bcrypt.hash('password', 10);

    const adminId = uuidv4();
    exec(`INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [adminId, orgId, 'admin@demo.com', passwordHash, 'Admin', 'User', 'admin']);

    const managerId = uuidv4();
    exec(`INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [managerId, orgId, 'manager@demo.com', passwordHash, 'Manager', 'User', 'manager']);

    const reps = [];
    for (let i = 0; i < 5; i++) {
        const id = uuidv4();
        const name = NAMES[i];
        exec(`INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, orgId, `rep${i + 1}@demo.com`, passwordHash, name.first, name.last, 'rep']);
        reps.push(id);
    }

    console.log('📋 Creating Leads...');
    const leadIds = [];
    for (let i = 0; i < 50; i++) {
        const id = uuidv4();
        const repId = reps[Math.floor(Math.random() * reps.length)];
        const status = ['new', 'contacted', 'qualified', 'converted', 'lost'][Math.floor(Math.random() * 5)];
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];

        exec(`INSERT INTO leads (id, org_id, assigned_to, first_name, last_name, phone, company, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, orgId, repId, name.first, name.last, `+1555000${1000 + i}`, company, status, 'web']);
        leadIds.push(id);
    }

    console.log('📞 Creating Calls & Analysis...');
    for (let i = 0; i < 100; i++) {
        const id = uuidv4();
        const repId = reps[Math.floor(Math.random() * reps.length)];
        const leadId = leadIds[Math.floor(Math.random() * leadIds.length)];
        // Past 30 days
        const startedAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString();
        const duration = Math.floor(Math.random() * 600); // 0-10 min

        const isAnswered = 1;
        const dispositions = ['converted', 'interested', 'not_interested', 'busy', 'voicemail'];
        // 20% conversion rate approx
        const disposition = dispositions[Math.floor(Math.random() * dispositions.length)];

        exec(`INSERT INTO calls (id, org_id, rep_id, lead_id, phone_number, started_at, duration_seconds, is_answered, call_type, disposition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, orgId, repId, leadId, `+1555000${Math.floor(Math.random() * 1000)}`, startedAt, duration, isAnswered, 'outbound', disposition]);

        // Add analysis for some calls
        if (Math.random() > 0.3) {
            const analysisId = uuidv4();
            const sentiment = Math.floor(Math.random() * 10) + 1;
            exec(`INSERT INTO call_analysis (id, call_id, sentiment_score, summary, sentiment_label) VALUES (?, ?, ?, ?, ?)`,
                [analysisId, id, sentiment, 'Automated call summary demonstrating AI capabilities.', sentiment > 7 ? 'Positive' : sentiment < 4 ? 'Negative' : 'Neutral']);
        }
    }

    console.log('⚔️ Creating Battlecards...');
    for (const obj of OBJECTIONS) {
        exec(`INSERT INTO battlecards (id, org_id, objection_pattern, rebuttal) VALUES (?, ?, ?, ?)`,
            [uuidv4(), orgId, obj.pattern, obj.rebuttal]);
    }

    console.log('✅ Seeding complete! Try logging in with demo@example.com (not created) or admin@demo.com / password');
    db.close();
}

seed().catch(console.error);
