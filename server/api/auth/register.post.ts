// server/api/auth/register.post.ts
import { db } from '~/server/utils/db';
import { isApiError } from '~/server/utils/errors';
import { createSession, setSessionCookie } from '~/server/utils/session';
import bcrypt from 'bcryptjs';
import type { RunResult } from 'better-sqlite3';

type RegistrationData = {
  username: string;
  password: string;
  email?: string;
};

type ExistingUser = {
  id: number;
};

type InsertResult = RunResult & {
  lastInsertRowid: number | bigint;
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, password, email } = body as RegistrationData;

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: 'Username and password are required',
    });
  }

  if (password.length < 6) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 6 characters long',
    });
  }

  try {
    // Normalize username to lowercase for case-insensitive comparison
    const normalizedUsername = username.toLowerCase();

    // Check if user already exists
    const existingUser = db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .get(normalizedUsername, email || null) as ExistingUser | undefined;

    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Username or email already exists',
      });
    }

    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = db
      .prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)')
      .run(normalizedUsername, hashedPassword, email || null) as InsertResult;

    const userId = typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid;

    // Create session and set HTTP-only cookie
    const session = await createSession(db, userId);
    setSessionCookie(event, session.id, session.expiresAt);

    return {
      id: userId,
      username: normalizedUsername,
      email,
    };
  } catch (err) {
    // Log only safe information - avoid exposing sensitive details
    if (isApiError(err)) {
      // For expected API errors, log only status code (no stack traces or details)
      console.error(`Registration failed: ${err.statusCode}`);
      throw err;
    }

    // For unexpected errors, log only a generic message
    console.error('Unexpected error during registration');
    throw createError({
      statusCode: 500,
      message: 'Server error during registration',
    });
  }
});
