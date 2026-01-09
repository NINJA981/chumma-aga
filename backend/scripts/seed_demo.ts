
import { generateId, query, execute, pgToSqlite, withTransaction } from '../src/config/database.js';
import { faker } from '@faker-js/faker';

// Hardcoded Organization ID for consistent demo
const ORG_ID = 'demo-org-vocalpulse';
const ADMIN_ID = 'demo-admin-id';

// Reps
const REPS = [
    { id: 'rep-1', firstName: 'Sarah', lastName: 'Jenkins', email: 'sarah@vocalpulse.com', role: 'rep' },
    { id: 'rep-2', firstName: 'Mike', lastName: 'Ross', email: 'mike@vocalpulse.com', role: 'rep' },
    { id: 'rep-3', firstName: 'Jessica', lastName: 'Pearson', email: 'jessica@vocalpulse.com', role: 'manager' },
    { id: 'rep-4', firstName: 'Harvey', lastName: 'Specter', email: 'harvey@vocalpulse.com', role: 'rep' },
    { id: 'rep-5', firstName: 'Louis', lastName: 'Litt', email: 'louis@vocalpulse.com', role: 'rep' },
];

async function seed() {
    console.log('🌱 Starting Demo Seed...');

    try {
        withTransaction(() => {
            // 0. Schema Migration (Manual for Soft Deletes) & Cleanup
            try {
                execute("ALTER TABLE leads ADD COLUMN deleted_at TEXT");
                console.log('✅ Added deleted_at column to leads table');
            } catch (e) {
                // Column likely exists
            }

            console.log('🧹 Cleaning up existing data...');
            try {
                // SQLite doesn't always support cascading deletes depending on config, so delete manually in order
                execute("DELETE FROM rep_xp_history");
                execute("DELETE FROM call_analysis");
                execute("DELETE FROM calls");
                execute("DELETE FROM leads");
                execute("DELETE FROM users");
                execute("DELETE FROM organizations");
                execute("DELETE FROM csv_imports");
            } catch (e) {
                console.log('⚠️ Cleanup warning (ignore if tables empty):', e);
            }

            // 1. Create Organization
            execute(
                pgToSqlite(`INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ($1, $2, $3)`),
                [ORG_ID, 'VocalPulse Demo', 'vocalpulse-demo']
            );

            // 2. Create Users
            for (const rep of REPS) {
                // Determine assignment weight based on role or random
                const weight = rep.role === 'rep' ? Math.floor(Math.random() * 5) + 1 : 1;

                execute(
                    pgToSqlite(`INSERT OR REPLACE INTO users (id, org_id, first_name, last_name, email, password_hash, role, is_active, lead_assignment_weight)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`),
                    [
                        rep.id,
                        ORG_ID,
                        rep.firstName,
                        rep.lastName,
                        rep.email,
                        '$2a$10$DEMOPASSWORDHASHPLACEHOLDER', // In real app use hashed password '123456'
                        rep.role,
                        1,
                        weight
                    ]
                );
            }

            // 3. Create Leads (100+)
            const LEADS_COUNT = 150;
            const leads = [];

            console.log(`Generating ${LEADS_COUNT} leads...`);

            for (let i = 0; i < LEADS_COUNT; i++) {
                const leadId = generateId();
                const assignedRep = REPS[Math.floor(Math.random() * REPS.length)];

                const status = faker.helpers.arrayElement(['new', 'contacted', 'qualified', 'converted', 'lost', 'contacted', 'new']); // Higher chance of new/contacted
                const source = faker.helpers.arrayElement(['web', 'referral', 'linkedin', 'conference', 'imported']);

                const firstName = faker.person.firstName();
                const lastName = faker.person.lastName();

                execute(
                    pgToSqlite(`INSERT INTO leads (id, org_id, assigned_to, first_name, last_name, email, phone, company, status, source, optimal_call_hour, optimal_call_day)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`),
                    [
                        leadId,
                        ORG_ID,
                        assignedRep.id,
                        firstName,
                        lastName,
                        faker.internet.email({ firstName, lastName }),
                        faker.phone.number(),
                        faker.company.name(),
                        status,
                        source,
                        faker.number.int({ min: 9, max: 17 }), // 9 AM to 5 PM
                        faker.number.int({ min: 1, max: 5 })   // Mon-Fri
                    ]
                );

                leads.push({ id: leadId, assignedTo: assignedRep.id, status });
            }

            // 4. Create Calls (History)
            const CALLS_COUNT = 300;
            console.log(`Generating ${CALLS_COUNT} calls...`);

            for (let i = 0; i < CALLS_COUNT; i++) {
                const callId = generateId();
                const lead = leads[Math.floor(Math.random() * leads.length)];
                const repId = lead.assignedTo;

                // Random date in last 30 days
                const startedAt = faker.date.recent({ days: 30 });
                const duration = faker.number.int({ min: 10, max: 1200 }); // 10s to 20m

                // Determine disposition based on duration and random chance
                let disposition = 'no_answer';
                let isAnswered = false;

                if (Math.random() > 0.4) { // 60% answer rate
                    isAnswered = true;
                    if (duration < 60) disposition = 'callback_scheduled';
                    else if (duration < 300) disposition = 'connected';
                    else if (duration < 600) disposition = 'qualified';
                    else disposition = 'converted';
                } else {
                    disposition = faker.helpers.arrayElement(['no_answer', 'busy', 'voicemail']);
                }

                execute(
                    pgToSqlite(`INSERT INTO calls (id, org_id, rep_id, lead_id, phone_number, call_type, started_at, ended_at, duration_seconds, is_answered, disposition)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`),
                    [
                        callId,
                        ORG_ID,
                        repId,
                        lead.id,
                        faker.phone.number(),
                        'outbound',
                        startedAt.toISOString(),
                        new Date(startedAt.getTime() + duration * 1000).toISOString(),
                        duration,
                        isAnswered ? 1 : 0,
                        disposition
                    ]
                );

                // Add Call Analysis if answered
                if (isAnswered) {
                    execute(
                        pgToSqlite(`INSERT INTO call_analysis (id, call_id, sentiment_score, sentiment_label, summary_bullets)
                        VALUES ($1, $2, $3, $4, $5)`),
                        [
                            generateId(),
                            callId,
                            faker.number.int({ min: 1, max: 10 }),
                            faker.helpers.arrayElement(['Positive', 'Neutral', 'Negative', 'Excited']),
                            JSON.stringify([
                                faker.lorem.sentence(),
                                faker.lorem.sentence(),
                                faker.lorem.sentence()
                            ])
                        ]
                    );
                }
            }
        });

        console.log('✅ Seed completed successfully!');

    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seed();
