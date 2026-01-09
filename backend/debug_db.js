const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'vocalpulse.db');
console.log('Opening DB at:', dbPath);
try {
    const db = new Database(dbPath, { verbose: console.log });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables);
    
    // Check users
    try {
        const users = db.prepare("SELECT * FROM users").all();
        console.log('Users:', users);
    } catch (e) { console.log('Users table error:', e.message); }

} catch (e) {
    console.error('DB Error:', e);
}
