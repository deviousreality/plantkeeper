import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { buildTables } from '~/server/utils/db_build';
import {
  createSession,
  getSessionById,
  deleteSession,
  deleteUserSessions,
  cleanupExpiredSessions,
  getCurrentUser,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  getSessionIdFromCookie,
} from '~/server/utils/session';
import { createMockH3Event } from '~/test/mocks/h3-events';
import type { H3Event } from 'h3';

// Mock cookie functions
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3');
  return {
    ...actual,
    parseCookies: vi.fn(),
    setCookie: vi.fn(),
  };
});

describe('Session Management', () => {
  let db: Database.Database;
  let userId: number;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    buildTables(db);

    // Create test user
    const result = db
      .prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)')
      .run('testuser', 'hashedpassword', 'test@example.com');
    userId = Number(result.lastInsertRowid);

    // Mock db module
    vi.doMock('~/server/utils/db', () => ({
      db,
    }));
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session for a user', async () => {
      const session = await createSession(db, userId);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.id).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(session.userId).toBe(userId);
      expect(session.expiresAt).toBeGreaterThan(Date.now());

      // Verify session was stored in database
      const dbSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any;
      expect(dbSession).toBeDefined();
      expect(dbSession.user_id).toBe(userId);
    });

    it('should create unique session IDs', async () => {
      const session1 = await createSession(db, userId);
      const session2 = await createSession(db, userId);

      expect(session1.id).not.toBe(session2.id);
    });

    it('should set expiration 7 days in the future', async () => {
      const before = Date.now();
      const session = await createSession(db, userId);
      const after = Date.now();

      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(session.expiresAt).toBeGreaterThanOrEqual(before + sevenDays);
      expect(session.expiresAt).toBeLessThanOrEqual(after + sevenDays + 1000); // 1s buffer
    });
  });

  describe('getSessionById', () => {
    it('should retrieve a valid session', async () => {
      const created = await createSession(db, userId);
      const retrieved = await getSessionById(db, created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.userId).toBe(userId);
      expect(retrieved?.expiresAt).toBe(created.expiresAt);
    });

    it('should return null for non-existent session', async () => {
      const session = await getSessionById(db, 'nonexistent-session-id');
      expect(session).toBeNull();
    });

    it('should return null for expired session', async () => {
      // Create session with expired timestamp
      const sessionId = 'expired-session';
      const expiredTime = Date.now() - 1000; // 1 second ago

      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, userId, expiredTime);

      const session = await getSessionById(db, sessionId);
      expect(session).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      const session = await createSession(db, userId);

      await deleteSession(db, session.id);

      const retrieved = await getSessionById(db, session.id);
      expect(retrieved).toBeNull();

      const dbSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
      expect(dbSession).toBeUndefined();
    });

    it('should not throw error when deleting non-existent session', async () => {
      await expect(deleteSession(db, 'non-existent')).resolves.not.toThrow();
    });
  });

  describe('deleteUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      const session1 = await createSession(db, userId);
      const session2 = await createSession(db, userId);

      // Create another user with session
      const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('otheruser', 'password');
      const otherUserId = Number(result.lastInsertRowid);
      const otherSession = await createSession(db, otherUserId);

      await deleteUserSessions(db, userId);

      // User's sessions should be deleted
      expect(await getSessionById(db, session1.id)).toBeNull();
      expect(await getSessionById(db, session2.id)).toBeNull();

      // Other user's session should remain
      expect(await getSessionById(db, otherSession.id)).toBeDefined();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions and keep valid ones', async () => {
      // Create valid session
      const validSession = await createSession(db, userId);

      // Create expired session
      const expiredId = 'expired-test-session';
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
        expiredId,
        userId,
        Date.now() - 1000
      );

      await cleanupExpiredSessions(db);

      // Valid session should remain
      expect(await getSessionById(db, validSession.id)).toBeDefined();

      // Expired session should be removed
      const expiredSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(expiredId);
      expect(expiredSession).toBeUndefined();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when valid session exists', async () => {
      const session = await createSession(db, userId);

      const { parseCookies } = await import('h3');
      vi.mocked(parseCookies).mockReturnValue({ plantkeeper_session: session.id });

      const event = createMockH3Event({}) as H3Event;
      const user = await getCurrentUser(db, event);

      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user?.username).toBe('testuser');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when no session cookie exists', async () => {
      const { parseCookies } = await import('h3');
      vi.mocked(parseCookies).mockReturnValue({});

      const event = createMockH3Event({}) as H3Event;
      const user = await getCurrentUser(db, event);

      expect(user).toBeNull();
    });

    it('should return null when session is invalid', async () => {
      const { parseCookies } = await import('h3');
      vi.mocked(parseCookies).mockReturnValue({ plantkeeper_session: 'invalid-session' });

      const event = createMockH3Event({}) as H3Event;
      const user = await getCurrentUser(db, event);

      expect(user).toBeNull();
    });

    it('should return null when session is expired', async () => {
      const expiredId = 'expired-session';
      db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
        expiredId,
        userId,
        Date.now() - 1000
      );

      const { parseCookies } = await import('h3');
      vi.mocked(parseCookies).mockReturnValue({ plantkeeper_session: expiredId });

      const event = createMockH3Event({}) as H3Event;
      const user = await getCurrentUser(db, event);

      expect(user).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const session = await createSession(db, userId);

      const { parseCookies } = await import('h3');
      vi.mocked(parseCookies).mockReturnValue({ plantkeeper_session: session.id });

      const event = createMockH3Event({}) as H3Event;
      const user = await requireAuth(db, event);

      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.username).toBe('testuser');
    });

    it('should throw 401 error when not authenticated', async () => {
      const { parseCookies } = await import('h3');
      vi.mocked(parseCookies).mockReturnValue({});

      const event = createMockH3Event({}) as H3Event;

      await expect(requireAuth(db, event)).rejects.toThrow();
    });
  });

  describe('Cookie helpers', () => {
    it('getSessionIdFromCookie should extract session ID', async () => {
      const { parseCookies } = await import('h3');
      vi.mocked(parseCookies).mockReturnValue({ plantkeeper_session: 'test-session-id' });

      const event = createMockH3Event({}) as H3Event;
      const sessionId = getSessionIdFromCookie(event);

      expect(sessionId).toBe('test-session-id');
    });

    it('getSessionIdFromCookie should return null when no cookie', async () => {
      const { parseCookies } = await import('h3');
      vi.mocked(parseCookies).mockReturnValue({});

      const event = createMockH3Event({}) as H3Event;
      const sessionId = getSessionIdFromCookie(event);

      expect(sessionId).toBeNull();
    });

    it('setSessionCookie should set cookie with correct options', async () => {
      const { setCookie } = await import('h3');
      const event = createMockH3Event({}) as H3Event;
      const expiresAt = Date.now() + 1000000;

      setSessionCookie(event, 'test-session-id', expiresAt);

      expect(setCookie).toHaveBeenCalledWith(event, 'plantkeeper_session', 'test-session-id', {
        httpOnly: true,
        secure: expect.any(Boolean),
        sameSite: 'lax',
        path: '/',
        expires: new Date(expiresAt),
      });
    });

    it('clearSessionCookie should set empty cookie', async () => {
      const { setCookie } = await import('h3');
      const event = createMockH3Event({}) as H3Event;

      clearSessionCookie(event);

      expect(setCookie).toHaveBeenCalledWith(event, 'plantkeeper_session', '', {
        httpOnly: true,
        secure: expect.any(Boolean),
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    });
  });
});
