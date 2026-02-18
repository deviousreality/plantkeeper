/**
 * Database utility module for PlantKeeper application
 *
 * This module provides database connection and utility functions
 * for interacting with the SQLite database. It uses better-sqlite3 for efficient
 * and synchronous database operations.
 */
import Database from 'better-sqlite3';
import type { H3Error } from 'h3';
import { createError } from 'h3';
import { createDatabase, getDbPath } from './db_build';

/**
 * Helper function to convert snake_case column names to camelCase for API responses
 * @param {Object} row - Database row with snake_case keys
 * @returns {Object} - Object with camelCase keys
 */
export const toCamelCase = <T extends Record<string, unknown>>(row: T): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = row[key];
  }
  return result;
};

/**
 * Helper function to safely prepare a SQL statement with error handling
 * @param {string} sql - SQL statement to prepare
 * @returns {Database.Statement} - Prepared statement
 */
export const safelyPrepare = (sql: string): Database.Statement => {
  try {
    return db.prepare(sql);
  } catch (error) {
    console.error(`SQL preparation error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Failed SQL: ${sql}`);
    throw new Error('Failed to prepare SQL statement');
  }
};

/**
 * Create a transaction from multiple SQL statements
 * @param {(...args: any[]) => any} fn - Function containing multiple database operations
 * @returns {(...args: any[]) => any} - Transaction function that works atomically
 */
export const createTransaction = (fn: (...args: any[]) => any): ((...args: any[]) => any) => {
  return db.transaction(fn);
};

/**
 * Utility function to convert null values to undefined in any object
 * @param {any} obj - Object that may contain null values
 * @returns {any} - Object with null values converted to undefined
 */
export const nullToUndefined = <T>(obj: T): T => {
  if (obj === null) return undefined as any;
  if (typeof obj !== 'object' || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(nullToUndefined) as any;
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = nullToUndefined(value);
  }
  return result;
};

/**
 * Utility function to convert undefined values to null in any object (for database storage)
 * @param {any} obj - Object that may contain undefined values
 * @returns {any} - Object with undefined values converted to null
 */
export const undefinedToNull = <T>(obj: T): T => {
  if (obj === undefined) return null as any;
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(undefinedToNull) as any;
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Explicitly convert undefined to null
    result[key] = value === undefined ? null : undefinedToNull(value);
  }
  return result;
};

export const handleDataTableTransactionError = (
  db: Database.Database,
  error: unknown | string,
  context: string,
  body: unknown
) => {
  // Only rollback if a transaction is actually active
  try {
    db.exec('ROLLBACK');
  } catch (rollbackError) {
    // Transaction was already rolled back, that's fine
    console.log('Transaction was already rolled back');
  }

  // console.error(`Error creating ${context}:`, error);
  // console.error('Original request body:', JSON.stringify(body, null, 2));
  // console.error('Full error details:', error);
  throw createError({
    statusCode: 500,
    message: `Server error creating ${context}: ${error instanceof Error ? error.message : String(error)}`,
  });
};

export const handleDatatableFetchError = (context: string, error: unknown): H3Error => {
  // console.error(`Error fetching ${context}:`, error);
  throw createError({
    statusCode: 500,
    message: `Server error fetching ${context}: ${error instanceof Error ? error.message : String(error)}`,
  });
};

export const validateFieldId = (id?: number) => {
  if (!id) {
    // console.error('Validation failed - invalid id:', id);
    throw createError({
      statusCode: 500,
      message: 'Valid plant ID is required',
    });
  }
};

export const generateUserTestData = (db: Database.Database): void => {
  db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)').run(
    'testuser',
    'password',
    'test@example.com'
  );
};

export const generateForeignKeySeedTestData = (db: Database.Database): void => {
  db.prepare('INSERT INTO plant_family (id, name) VALUES (?, ?)').run(1, 'Araceae');
  db.prepare('INSERT INTO plant_genus (id, name, family_id) VALUES (?, ?, ?)').run(1, 'Monstera', 1);
  db.prepare('INSERT INTO plant_species (id, name, genus_id) VALUES (?, ?, ?)').run(1, 'Monstera deliciosa', 1);
};

// Initialize the database connection
let _db = createDatabase(getDbPath());

// In test environment, use globalThis.db if available (set by vi.stubGlobal)
// This allows tests to inject their own database instance
const db = new Proxy(_db, {
  get(target, prop) {
    const testDb = (globalThis as any).db;
    const activeDb = testDb || target;
    const value = activeDb[prop];
    return typeof value === 'function' ? value.bind(activeDb) : value;
  },
});

export { db };
