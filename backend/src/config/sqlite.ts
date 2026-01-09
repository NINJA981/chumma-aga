import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './env.js';

// Database file path
const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'vocalpulse.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
export const db: Database.Database = new Database(config.database.sqlitePath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

console.log(`✅ SQLite connected: ${DB_PATH}`);

/**
 * Query helper - returns all rows
 */
export function query<T = any>(sql: string, params: any[] = []): T[] {
    try {
        const stmt = db.prepare(sql);
        return stmt.all(...params) as T[];
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
}

/**
 * Query helper - returns first row
 */
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
    try {
        const stmt = db.prepare(sql);
        return (stmt.get(...params) as T) || null;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
}

/**
 * Execute helper - for INSERT/UPDATE/DELETE
 */
export function execute(sql: string, params: any[] = []): Database.RunResult {
    try {
        const stmt = db.prepare(sql);
        return stmt.run(...params);
    } catch (error) {
        console.error('Execute error:', error);
        throw error;
    }
}

/**
 * Transaction helper
 */
export function withTransaction<T>(fn: () => T): T {
    return db.transaction(fn)();
}

/**
 * Initialize database schema
 */
export function initializeDatabase(): void {
    const schemaPath = path.join(process.cwd(), '..', 'database', 'schema-sqlite.sql');

    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        db.exec(schema);
        console.log('✅ Database schema initialized');
    } else {
        console.log('⚠️ Schema file not found, using existing database');
    }
}

/**
 * Generate UUID
 */
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
    db.close();
    console.log('SQLite connection closed');
}

// Initialize on import
initializeDatabase();
