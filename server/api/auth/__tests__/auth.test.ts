import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import { useDBTestUtils, useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import { Database } from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import type { H3Event } from 'h3';

// Mock session utilities
const mockCreateSession = vi.fn();
const mockSetSessionCookie = vi.fn();
const mockDeleteSession = vi.fn();
const mockClearSessionCookie = vi.fn();
const mockGetSessionIdFromCookie = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('~/server/utils/session', () => ({
  createSession: mockCreateSession,
  setSessionCookie: mockSetSessionCookie,
  deleteSession: mockDeleteSession,
  clearSessionCookie: mockClearSessionCookie,
  getSessionIdFromCookie: mockGetSessionIdFromCookie,
  getCurrentUser: mockGetCurrentUser,
}));

describe('POST /api/auth/login', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  beforeEach(async () => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils({ skipUserSeed: true });

    // Create test user with hashed password
    const hashedPassword = await bcrypt.hash('password123', 10);
    dbInstance
      .prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)')
      .run('testuser', hashedPassword, 'testuser@example.com');

    // Setup mock session creation
    mockCreateSession.mockResolvedValue({
      id: 'mock-session-id',
      userId: 1,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  });

  afterEach(() => {
    dbInstance.close();
  });

  const handler = await import('../login.post');

  it('should login successfully with valid credentials and create session', async () => {
    const event = createMockH3Event({
      body: {
        username: 'testuser',
        password: 'password123',
      },
    }) as H3Event;

    const response = (await handler.default(event, dbInstance)) as any;

    expect(response).toBeDefined();
    expect(response.id).toBe(1);
    expect(response.username).toBe('testuser');
    expect(response.email).toBe('testuser@example.com');

    // Verify session was created
    expect(mockCreateSession).toHaveBeenCalledWith(dbInstance, 1);

    // Verify session cookie was set
    expect(mockSetSessionCookie).toHaveBeenCalledWith(event, 'mock-session-id', expect.any(Number));
  });

  it('should return 400 if username is missing', async () => {
    const event = createMockH3Event({
      body: {
        password: 'password123',
      },
    }) as H3Event;

    await expect(handler.default(event, dbInstance)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Username and password are required',
    });

    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('should return 400 if password is missing', async () => {
    const event = createMockH3Event({
      body: {
        username: 'testuser',
      },
    }) as H3Event;

    await expect(handler.default(event, dbInstance)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Username and password are required',
    });

    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('should return 401 if user does not exist', async () => {
    const event = createMockH3Event({
      body: {
        username: 'nonexistent',
        password: 'password123',
      },
    }) as H3Event;

    await expect(handler.default(event, dbInstance)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid credentials',
    });

    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('should return 401 if password is incorrect', async () => {
    const event = createMockH3Event({
      body: {
        username: 'testuser',
        password: 'wrongpassword',
      },
    }) as H3Event;

    await expect(handler.default(event, dbInstance)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid credentials',
    });

    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('should not include password in response', async () => {
    const event = createMockH3Event({
      body: {
        username: 'testuser',
        password: 'password123',
      },
    }) as H3Event;

    const response = (await handler.default(event, dbInstance)) as any;

    expect(response.password).toBeUndefined();
  });

  it('should login successfully with case-insensitive username', async () => {
    const event = createMockH3Event({
      body: {
        username: 'TestUser', // Different case than 'testuser'
        password: 'password123',
      },
    }) as H3Event;

    const response = (await handler.default(event, dbInstance)) as any;

    expect(response).toBeDefined();
    expect(response.id).toBe(1);
    expect(response.username).toBe('testuser'); // Username stored in lowercase
    expect(response.email).toBe('testuser@example.com');

    // Verify session was created
    expect(mockCreateSession).toHaveBeenCalledWith(dbInstance, 1);
  });

  it('should login successfully with uppercase username', async () => {
    const event = createMockH3Event({
      body: {
        username: 'TESTUSER', // All uppercase
        password: 'password123',
      },
    }) as H3Event;

    const response = (await handler.default(event, dbInstance)) as any;

    expect(response).toBeDefined();
    expect(response.id).toBe(1);
    expect(response.username).toBe('testuser'); // Username stored in lowercase
  });
});

describe('POST /api/auth/logout', async () => {
  useH3TestUtils();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const handler = await import('../logout.post');

  it('should delete session and clear cookie when session exists', async () => {
    mockGetSessionIdFromCookie.mockReturnValue('test-session-id');

    const event = createMockH3Event({}) as H3Event;
    const response = await handler.default(event);

    expect(response).toEqual({ success: true });
    expect(mockDeleteSession).toHaveBeenCalledWith(expect.any(Object), 'test-session-id');
    expect(mockClearSessionCookie).toHaveBeenCalledWith(event);
  });

  it('should clear cookie even when no session exists', async () => {
    mockGetSessionIdFromCookie.mockReturnValue(null);

    const event = createMockH3Event({}) as H3Event;
    const response = await handler.default(event);

    expect(response).toEqual({ success: true });
    expect(mockDeleteSession).not.toHaveBeenCalled();
    expect(mockClearSessionCookie).toHaveBeenCalledWith(event);
  });
});

describe('GET /api/auth/session', async () => {
  useH3TestUtils();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const handler = await import('../session.get');

  it('should return user when authenticated', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
    };
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const event = createMockH3Event({}) as H3Event;
    const response = await handler.default(event);

    expect(response).toEqual(mockUser);
    expect(mockGetCurrentUser).toHaveBeenCalledWith(expect.any(Object), event);
  });

  it('should return null when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const event = createMockH3Event({}) as H3Event;
    const response = await handler.default(event);

    expect(response).toBeNull();
    expect(mockGetCurrentUser).toHaveBeenCalledWith(expect.any(Object), event);
  });
});

describe('POST /api/auth/register', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  beforeEach(async () => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils({ skipUserSeed: true });

    // Setup mock session creation
    mockCreateSession.mockResolvedValue({
      id: 'mock-session-id',
      userId: 1,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  });

  afterEach(() => {
    dbInstance.close();
  });

  const handler = await import('../register.post');

  it('should register new user successfully', async () => {
    const event = createMockH3Event({
      body: {
        username: 'newuser',
        password: 'password123',
        email: 'new@example.com',
      },
    }) as H3Event;

    const response = (await handler.default(event)) as any;

    expect(response).toBeDefined();
    expect(response.id).toBeGreaterThan(0);
    expect(response.username).toBe('newuser');
    expect(response.email).toBe('new@example.com');

    // Verify user was created in database with lowercase username
    const user = dbInstance.prepare('SELECT * FROM users WHERE username = ?').get('newuser') as any;
    expect(user).toBeDefined();
    expect(user.username).toBe('newuser');
    expect(user.password).not.toBe('password123'); // Should be hashed

    // Verify session was created with db parameter
    expect(mockCreateSession).toHaveBeenCalledWith(dbInstance, expect.any(Number));

    // Verify session cookie was set
    expect(mockSetSessionCookie).toHaveBeenCalledWith(event, 'mock-session-id', expect.any(Number));
  });

  it('should return 400 if username is missing', async () => {
    const event = createMockH3Event({
      body: {
        password: 'password123',
      },
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Username and password are required',
    });
  });

  it('should return 400 if password is missing', async () => {
    const event = createMockH3Event({
      body: {
        username: 'newuser',
      },
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Username and password are required',
    });
  });

  it('should return 409 if username already exists', async () => {
    // Create existing user
    dbInstance.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('existinguser', 'hashedpassword');

    const event = createMockH3Event({
      body: {
        username: 'existinguser',
        password: 'password123',
      },
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Username or email already exists',
    });
  });

  it('should return 409 if username already exists (case-insensitive)', async () => {
    // Create existing user
    dbInstance.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('existinguser', 'hashedpassword');

    const event = createMockH3Event({
      body: {
        username: 'ExistingUser', // Different case - will be normalized to lowercase
        password: 'password123',
      },
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Username or email already exists',
    });
  });

  it('should return 409 if email already exists', async () => {
    // Create existing user
    dbInstance
      .prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)')
      .run('existinguser', 'hashedpassword', 'existing@example.com');

    const event = createMockH3Event({
      body: {
        username: 'newuser',
        password: 'password123',
        email: 'existing@example.com',
      },
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Username or email already exists',
    });
  });

  it('should hash password before storing', async () => {
    const event = createMockH3Event({
      body: {
        username: 'hashtest',
        password: 'password123',
      },
    }) as H3Event;

    await handler.default(event);

    const user = dbInstance.prepare('SELECT password FROM users WHERE username = ?').get('hashtest') as any;

    // Password should be hashed (bcrypt hashes start with $2)
    expect(user.password).toMatch(/^\$2[aby]\$/);
    expect(user.password).not.toBe('password123');
  });

  it('should handle optional email', async () => {
    const event = createMockH3Event({
      body: {
        username: 'noemailuser',
        password: 'password123',
      },
    }) as H3Event;

    const response = (await handler.default(event)) as any;

    expect(response).toBeDefined();
    expect(response.username).toBe('noemailuser');
  });

  it('should normalize username to lowercase during registration', async () => {
    const event = createMockH3Event({
      body: {
        username: 'MixedCaseUser',
        password: 'password123',
      },
    }) as H3Event;

    const response = (await handler.default(event)) as any;

    expect(response).toBeDefined();
    expect(response.username).toBe('mixedcaseuser'); // Should be lowercase

    // Verify database has lowercase
    const user = dbInstance.prepare('SELECT * FROM users WHERE username = ?').get('mixedcaseuser') as any;
    expect(user).toBeDefined();
    expect(user.username).toBe('mixedcaseuser');
  });
});
