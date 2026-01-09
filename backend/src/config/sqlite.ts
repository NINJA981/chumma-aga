import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'vocalpulse.db');

// Ensure directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

export const db: DatabaseType = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

console.log(`Connected to SQLite database at ${dbPath}`);
