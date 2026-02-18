import { cleanupExpiredSessions } from '../utils/session';
import { db } from '../utils/db';

// Track last cleanup time
let lastCleanup = 0;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

/**
 * Middleware to periodically clean up expired sessions
 * This runs on every request but only actually cleans up once per hour
 */
export default defineEventHandler(async (event) => {
  const now = Date.now();

  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    // Run cleanup asynchronously, don't wait for it
    cleanupExpiredSessions(db).catch((err) => {
      console.error('Failed to cleanup expired sessions:', err);
    });
  }
});
