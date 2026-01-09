import Database from 'better-sqlite3';
export { Database };
import path from 'path';
import fs from 'fs';
import { config } from './env.js';

// Database file path
const DB_PATH = config.database.sqlitePath;

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
export const db: Database.Database = new Database(DB_PATH);

// Enable foreign keys and WAL mode
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

console.log(`✅ SQLite connected: ${DB_PATH}`);

/**
 * Query - returns all rows
 */
export function query<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
}

/**
 * Query - returns first row
 */
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const stmt = db.prepare(sql);
    return (stmt.get(...params) as T) || null;
}

/**
 * Execute - for INSERT/UPDATE/DELETE
 */
export function execute(sql: string, params: unknown[] = []): Database.RunResult {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
}

/**
 * Transaction helper
 */
export function withTransaction<T>(fn: () => T): T {
    return db.transaction(fn)();
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
 * Convert PostgreSQL query to SQLite format
 * Handles: $1 placeholders, NOW(), ILIKE, INTERVAL, etc.
 */
export function pgToSqlite(sql: string): string {
    let result = sql;

    // Convert $1, $2, etc. to ?
    result = result.replace(/\$\d+/g, '?');

    // Convert NOW() to datetime('now')
    result = result.replace(/NOW\(\)/gi, "datetime('now')");

    // Convert CURRENT_DATE to date('now')
    result = result.replace(/CURRENT_DATE/gi, "date('now')");

    // Convert ILIKE to LIKE (SQLite LIKE is case-insensitive for ASCII)
    result = result.replace(/ILIKE/gi, 'LIKE');

    // Convert INTERVAL expressions
    // NOW() - INTERVAL '30 days' -> datetime('now', '-30 days')
    result = result.replace(/datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s*days?'/gi,
        (match, days) => `datetime('now', '-${days} days')`);
    result = result.replace(/datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s*minutes?'/gi,
        (match, mins) => `datetime('now', '-${mins} minutes')`);

    // Convert date('now') - INTERVAL
    result = result.replace(/date\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s*days?'/gi,
        (match, days) => `date('now', '-${days} days')`);

    // Convert true/false to 1/0
    result = result.replace(/\s=\s*true\b/gi, ' = 1');
    result = result.replace(/\s=\s*false\b/gi, ' = 0');

    // Convert FILTER (WHERE ...) to CASE WHEN for COUNT/SUM
    // COUNT(*) FILTER (WHERE condition) -> SUM(CASE WHEN condition THEN 1 ELSE 0 END)
    result = result.replace(/COUNT\(\*\)\s*FILTER\s*\(\s*WHERE\s+([^)]+)\)/gi,
        (match, condition) => `SUM(CASE WHEN ${condition} THEN 1 ELSE 0 END)`);

    // AVG(...) FILTER (WHERE condition) -> needs subquery or CASE
    result = result.replace(/AVG\(([^)]+)\)\s*FILTER\s*\(\s*WHERE\s+([^)]+)\)/gi,
        (match, field, condition) => `AVG(CASE WHEN ${condition} THEN ${field} ELSE NULL END)`);

    // COALESCE(SUM(...), 0) FILTER (WHERE ...) 
    result = result.replace(/COALESCE\(SUM\(([^)]+)\),\s*0\)\s*FILTER\s*\(\s*WHERE\s+([^)]+)\)/gi,
        (match, field, condition) => `COALESCE(SUM(CASE WHEN ${condition} THEN ${field} ELSE 0 END), 0)`);

    // EXTRACT(DOW FROM field) -> strftime('%w', field)
    result = result.replace(/EXTRACT\(DOW\s+FROM\s+([^)]+)\)::int/gi,
        (match, field) => `CAST(strftime('%w', ${field}) AS INTEGER)`);

    // EXTRACT(HOUR FROM field) -> strftime('%H', field)
    result = result.replace(/EXTRACT\(HOUR\s+FROM\s+([^)]+)\)::int/gi,
        (match, field) => `CAST(strftime('%H', ${field}) AS INTEGER)`);

    // ::numeric and ::int casts
    result = result.replace(/::numeric/gi, '');
    result = result.replace(/::int/gi, '');

    // NULLIF stays the same in SQLite
    // ROUND stays the same in SQLite

    return result;
}

/**
 * Initialize database schema
 */
export function initializeDatabase(): void {
    // Check if tables exist
    const tablesExist = queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='users'"
    );

    if (!tablesExist || tablesExist.count === 0) {
        const schemaPath = path.join(process.cwd(), '..', 'database', 'schema-sqlite.sql');

        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf-8');
            db.exec(schema);
        }
    }
}

/**
 * Close database
 */
export function closeDatabase(): void {
    db.close();
}

// Initialize schema on import
initializeDatabase();
