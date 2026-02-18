import type { H3Event } from 'h3';
import { parseCookies, setCookie, createError } from 'h3';
import type Database from 'better-sqlite3';
import { randomBytes } from 'crypto';

export interface Session {
  id: string;
  userId: number;
  expiresAt: number;
}

// Session configuration
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const SESSION_COOKIE_NAME = 'plantkeeper_session';

/**
 * Generate a secure random session ID
 */
function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user
 */
export async function createSession(db: Database.Database, userId: number): Promise<Session> {
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + SESSION_DURATION;

  db.prepare(
    `
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `
  ).run(sessionId, userId, expiresAt);

  return {
    id: sessionId,
    userId,
    expiresAt,
  };
}

/**
 * Validate and retrieve a session by ID
 */
export async function getSessionById(db: Database.Database, sessionId: string): Promise<Session | null> {
  const now = Date.now();

  const session = db
    .prepare(
      `
    SELECT id, user_id as userId, expires_at as expiresAt
    FROM sessions
    WHERE id = ? AND expires_at > ?
  `
    )
    .get(sessionId, now) as Session | undefined;

  return session || null;
}

/**
 * Delete a session (for logout)
 */
export async function deleteSession(db: Database.Database, sessionId: string): Promise<void> {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(db: Database.Database, userId: number): Promise<void> {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(db: Database.Database): Promise<void> {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
}

/**
 * Get session ID from HTTP-only cookie
 */
export function getSessionIdFromCookie(event: H3Event): string | null {
  const cookies = parseCookies(event);
  return cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Set session cookie
 */
export function setSessionCookie(event: H3Event, sessionId: string, expiresAt: number): void {
  setCookie(event, SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(event: H3Event): void {
  setCookie(event, SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Get current user from session
 */
export async function getCurrentUser(
  db: Database.Database,
  event: H3Event
): Promise<{ id: number; username: string; email: string | null } | null> {
  const sessionId = getSessionIdFromCookie(event);
  if (!sessionId) {
    return null;
  }

  const session = await getSessionById(db, sessionId);
  if (!session) {
    return null;
  }

  const user = db
    .prepare(
      `
    SELECT id, username, email
    FROM users
    WHERE id = ?
  `
    )
    .get(session.userId) as { id: number; username: string; email: string | null } | undefined;

  return user || null;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(
  db: Database.Database,
  event: H3Event
): Promise<{ id: number; username: string; email: string | null }> {
  const user = await getCurrentUser(db, event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Please log in',
    });
  }
  return user;
}
