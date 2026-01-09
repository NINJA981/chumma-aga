import { db } from './src/config/sqlite'; // remove .js extension for tsx resolution typically, or keep if using ESM
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    try {
        console.log('Seeding...');
        const email = 'demo@vocalpulse.com';
        const password = 'password123';
        const orgName = 'Demo Corp';

        // Check if user exists
        const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (existing) {
            console.log('User already exists');
            return;
        }

        // Create Org
        const orgId = uuidv4();
        console.log('Creating Org:', orgId);
        // Clean slug
        const slug = 'demo-corp-' + Date.now(); // Ensure unique

        try {
            db.prepare('INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)').run(orgId, orgName, slug);
        } catch (e) {
            console.log("Org insert error (might exist):", e.message);
            // Verify if org exists? Just ignore for demo
        }

        // Hash password
        const hash = await bcrypt.hash(password, 12);

        // Create User
        const userId = uuidv4();
        console.log('Creating User:', userId);
        db.prepare(`
            INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, orgId, email, hash, 'Demo', 'User', 'rep');

        console.log('Seeding complete! User created: ' + email);
    } catch (e) {
        console.error('Seeding failed:', e);
    }
}

seed();
