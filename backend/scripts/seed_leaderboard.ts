
import { db, generateId } from '../src/config/database'; // Adjust path if needed when running via tsx
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Random avatar helper
const AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
];

async function seedLeaderboard() {
    console.log('🌱 Seeding leaderboard data...');

    try {
        // 1. Get or create Org
        let org = db.prepare('SELECT * FROM organizations LIMIT 1').get();
        let orgId;

        if (!org) {
            orgId = generateId();
            db.prepare('INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)').run(orgId, 'Demo Corp', 'demo-corp');
            console.log('Created Org:', orgId);
        } else {
            orgId = org.id;
            console.log('Using Org:', orgId);
        }

        // 2. Create Sample Reps
        const reps = [
            { first: 'Sarah', last: 'Wilson', seed: 'Sarah' },
            { first: 'Mike', last: 'Chen', seed: 'Mark' },
            { first: 'Jessica', last: 'Davis', seed: 'Maria' },
            { first: 'Tom', last: 'Baker', seed: 'David' },
            { first: 'Emily', last: 'Rodriguez', seed: 'Emma' }
        ];

        const passwordHash = await bcrypt.hash('password123', 10);

        for (const rep of reps) {
            const email = `${rep.first.toLowerCase()}.${rep.last.toLowerCase()}@example.com`;

            // Check if exists
            let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
            let userId;

            if (!user) {
                userId = generateId();
                db.prepare(`
                    INSERT INTO users (id, org_id, first_name, last_name, email, password_hash, role, avatar_url, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, 'rep', ?, 1)
                `).run(
                    userId,
                    orgId,
                    rep.first,
                    rep.last,
                    email,
                    passwordHash,
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${rep.seed}`
                );
                console.log(`Created rep: ${rep.first} ${rep.last}`);
            } else {
                userId = user.id;
                // Update avatar just in case
                db.prepare(`UPDATE users SET avatar_url = ? WHERE id = ?`)
                    .run(`https://api.dicebear.com/7.x/avataaars/svg?seed=${rep.seed}`, userId);
                console.log(`Updated rep: ${rep.first} ${rep.last}`);
            }

            // 3. Generate XP History
            // Clear existing history for clean slate? No, just add more.

            // Add 10-20 random XP events over last 7 days
            const numEvents = Math.floor(Math.random() * 10) + 10;
            const insertXp = db.prepare(`
                INSERT INTO rep_xp_history (id, rep_id, xp_delta, reason, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (let i = 0; i < numEvents; i++) {
                const xp = Math.floor(Math.random() * 50) + 10;
                const daysAgo = Math.floor(Math.random() * 7);
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);

                const reasons = ['Call Connected', 'Deal Closed', 'Good Sentiment', 'High Talk Time'];
                const reason = reasons[Math.floor(Math.random() * reasons.length)];

                insertXp.run(
                    generateId(),
                    userId,
                    xp,
                    reason,
                    date.toISOString()
                );
            }
        }

        console.log('✅ Leaderboard seeding complete!');
        console.log('👉 Restart the backend server for changes to take effect.');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
}

seedLeaderboard();
