const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/vocalpulse.db');
const schemaPath = path.join(__dirname, '../../database/schema-sqlite.sql');

console.log('Initializing DB at:', dbPath);
console.log('Using schema from:', schemaPath);

// Ensure data dir exists
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

try {
    const db = new Database(dbPath, { verbose: console.log });
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('Database initialized successfully.');
} catch (e) {
    console.error('Failed to initialize database:', e);
    process.exit(1);
}
