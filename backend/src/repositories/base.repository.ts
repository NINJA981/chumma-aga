/**
 * Base Repository with common CRUD operations
 * All repositories extend this class
 */

import { db, query, queryOne, execute, generateId, pgToSqlite } from '../config/database.js';
import { fromDatabaseError } from '../errors/index.js';

export interface QueryOptions {
    page?: number;
    limit?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

/**
 * Base repository with common database operations
 */
export abstract class BaseRepository<T> {
    protected readonly tableName: string;
    protected readonly primaryKey: string = 'id';

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    /**
     * Find a record by its primary key
     */
    findById(id: string): T | null {
        try {
            return queryOne<T>(
                `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
                [id]
            );
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Find all records matching conditions
     */
    findAll(
        conditions: Record<string, unknown> = {},
        options: QueryOptions = {}
    ): T[] {
        try {
            const { where, params } = this.buildWhereClause(conditions);
            const orderBy = options.orderBy || 'created_at';
            const orderDir = options.orderDir || 'DESC';

            let sql = `SELECT * FROM ${this.tableName} ${where} ORDER BY ${orderBy} ${orderDir}`;

            if (options.limit) {
                sql += ` LIMIT ${options.limit}`;
                if (options.page && options.page > 1) {
                    sql += ` OFFSET ${(options.page - 1) * options.limit}`;
                }
            }

            return query<T>(sql, params);
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Find records with pagination
     */
    findPaginated(
        conditions: Record<string, unknown> = {},
        options: QueryOptions = {}
    ): PaginatedResult<T> {
        const page = options.page || 1;
        const limit = options.limit || 50;

        try {
            const { where, params } = this.buildWhereClause(conditions);

            // Get total count
            const countResult = queryOne<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${this.tableName} ${where}`,
                params
            );
            const total = countResult?.count || 0;

            // Get paginated data
            const data = this.findAll(conditions, { ...options, page, limit });

            return {
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Find one record matching conditions
     */
    findOne(conditions: Record<string, unknown>): T | null {
        try {
            const { where, params } = this.buildWhereClause(conditions);
            return queryOne<T>(
                `SELECT * FROM ${this.tableName} ${where} LIMIT 1`,
                params
            );
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Create a new record
     */
    create(data: Partial<T>): string {
        try {
            const id = generateId();
            const dataWithId = { id, ...data };

            const columns = Object.keys(dataWithId);
            const placeholders = columns.map(() => '?').join(', ');
            const values = Object.values(dataWithId);

            execute(
                `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
                values
            );

            return id;
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Update a record by ID
     */
    update(id: string, data: Partial<T>): boolean {
        try {
            const columns = Object.keys(data);
            const setClause = columns.map(col => `${col} = ?`).join(', ');
            const values = [...Object.values(data), id];

            const result = execute(
                `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`,
                values
            );

            return result.changes > 0;
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Delete a record by ID
     */
    delete(id: string): boolean {
        try {
            const result = execute(
                `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
                [id]
            );
            return result.changes > 0;
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Check if a record exists
     */
    exists(id: string): boolean {
        const result = queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
            [id]
        );
        return (result?.count || 0) > 0;
    }

    /**
     * Count records matching conditions
     */
    count(conditions: Record<string, unknown> = {}): number {
        try {
            const { where, params } = this.buildWhereClause(conditions);
            const result = queryOne<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${this.tableName} ${where}`,
                params
            );
            return result?.count || 0;
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Execute a raw SQL query
     */
    protected rawQuery<R>(sql: string, params: unknown[] = []): R[] {
        try {
            return query<R>(pgToSqlite(sql), params);
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Execute a raw SQL query returning one result
     */
    protected rawQueryOne<R>(sql: string, params: unknown[] = []): R | null {
        try {
            return queryOne<R>(pgToSqlite(sql), params);
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Execute raw SQL (INSERT/UPDATE/DELETE)
     */
    protected rawExecute(sql: string, params: unknown[] = []) {
        try {
            return execute(pgToSqlite(sql), params);
        } catch (error) {
            throw fromDatabaseError(error);
        }
    }

    /**
     * Build WHERE clause from conditions object
     */
    private buildWhereClause(conditions: Record<string, unknown>): {
        where: string;
        params: unknown[];
    } {
        const entries = Object.entries(conditions).filter(
            ([_, value]) => value !== undefined && value !== null
        );

        if (entries.length === 0) {
            return { where: '', params: [] };
        }

        const clauses = entries.map(([key]) => `${key} = ?`);
        const params = entries.map(([_, value]) => value);

        return {
            where: `WHERE ${clauses.join(' AND ')}`,
            params,
        };
    }
}

// Re-export database utilities for transaction support
export { db, query, queryOne, execute, generateId, pgToSqlite };
export { withTransaction } from '../config/database.js';
