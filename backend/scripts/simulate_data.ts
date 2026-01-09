import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/vocalpulse.db');
const db = new Database(dbPath);

console.log('🔌 Connected to database:', dbPath);

// --- Helpers ---
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomPhone = () => `+1${random(200, 999)}${random(200, 999)}${random(1000, 9999)}`;
const randomDate = (daysBack) => {
    const d = new Date();
    d.setDate(d.getDate() - random(0, daysBack));
    d.setHours(random(9, 17), random(0, 59), 0);
    return d.toISOString();
};

const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore'];
const companies = ['Acme Corp', 'Globex', 'Soylent Corp', 'Initech', 'Umbrella Corp', 'Stark Ind', 'Wayne Ent', 'Cyberdyne', 'Massive Dynamic', 'Hooli'];

const generateName = () => ({
    first: sample(firstNames),
    last: sample(lastNames)
});

// --- Main ---
async function main() {
    try {
        console.log('🚀 Starting Data Simulation...');

        // 1. Get or Create User/Org
        let user = db.prepare("SELECT * FROM users WHERE email = ?").get('demo@vocalpulse.com');
        let orgId;

        if (!user) {
            console.log('⚠️ Demo user not found, creating basic fallback...');
            orgId = uuidv4();
            db.prepare("INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)").run(orgId, 'Demo Corp', 'demo-' + Date.now());

            const userId = uuidv4();
            db.prepare(`
                INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(userId, orgId, 'demo@vocalpulse.com', 'hash_placeholder', 'Demo', 'User', 'manager');

            user = { id: userId, org_id: orgId };
        } else {
            orgId = user.org_id;
        }

        console.log(`👤 Using User: ${user.id} (Org: ${orgId})`);

        // 2. Generate 500 Leads
        const statuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
        const weights = [0.2, 0.3, 0.2, 0.1, 0.2]; // Distribution

        console.log('🌱 Generating 500 Leads...');
        const leads = [];

        const insertLead = db.prepare(`
            INSERT INTO leads (id, org_id, assigned_to, first_name, last_name, phone, email, company, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        db.transaction(() => {
            for (let i = 0; i < 500; i++) {
                const name = generateName();
                // Weighted status selection
                const r = Math.random();
                let acc = 0;
                let status = statuses[0];
                for (let j = 0; j < weights.length; j++) {
                    acc += weights[j];
                    if (r < acc) {
                        status = statuses[j];
                        break;
                    }
                }

                const leadId = uuidv4();
                const lead = {
                    id: leadId,
                    org_id: orgId,
                    assigned_to: user.id,
                    first_name: name.first,
                    last_name: name.last,
                    phone: randomPhone(),
                    email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@example.com`,
                    company: Math.random() > 0.3 ? sample(companies) : null,
                    status: status,
                    created_at: randomDate(30)
                };

                insertLead.run(
                    lead.id, lead.org_id, lead.assigned_to,
                    lead.first_name, lead.last_name, lead.phone,
                    lead.email, lead.company, lead.status, lead.created_at
                );
                leads.push(lead);
            }
        })();

        console.log('✅ 500 Leads Inserted');

        // 3. Generate Calls Analysis
        console.log('📞 Generating Call Logs...');

        const insertCall = db.prepare(`
            INSERT INTO calls (
                id, callyzer_id, org_id, rep_id, lead_id, phone_number, 
                call_type, call_source, started_at, duration_seconds, 
                is_answered, disposition, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let callCount = 0;

        db.transaction(() => {
            for (const lead of leads) {
                // If new, mostly no calls, or 1 missed
                if (lead.status === 'new') {
                    if (Math.random() < 0.2) {
                        // 1 missed/unanswered call
                        insertCall.run(
                            uuidv4(), uuidv4(), orgId, user.id, lead.id, lead.phone,
                            'outbound', 'sim', randomDate(5), 0,
                            0, 'no_answer', randomDate(5)
                        );
                        callCount++;
                    }
                    continue;
                }

                // If not new, generate 1-5 calls
                const numCalls = random(1, 5);
                for (let k = 0; k < numCalls; k++) {
                    const isLong = Math.random() > 0.3;
                    const duration = isLong ? random(60, 600) : random(0, 59);
                    const isAnswered = duration > 0 ? 1 : 0;
                    const disposition = isAnswered ? 'connected' : 'no_answer';
                    const callDate = randomDate(20);

                    insertCall.run(
                        uuidv4(), uuidv4(), orgId, user.id, lead.id, lead.phone,
                        'outbound', 'sim', callDate, duration,
                        isAnswered, disposition, callDate
                    );
                    callCount++;
                }
            }
        })();

        console.log(`✅ ${callCount} Calls Inserted`);
        console.log('🎉 Simulation Complete!');

    } catch (error) {
        console.error('Simulation Failed:', error);
    }
}

main();
