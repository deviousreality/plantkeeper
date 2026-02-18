import Database from 'better-sqlite3';
import { db } from '../utils/db';

/**
 * Migration to add sessions table for session-based authentication
 */
const addSessionsTable = (db: Database.Database) => {
  console.log('Adding sessions table...');

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create index on expires_at for efficient cleanup queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)
  `);

  console.log('Sessions table created successfully');
};

try {
  addSessionsTable(db);
  console.log('Migration complete!');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
