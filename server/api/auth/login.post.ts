// server/api/auth/login.post.ts
import { db } from '~/server/utils/db';
import { isApiError } from '~/server/utils/errors';
import { createSession, setSessionCookie } from '~/server/utils/session';
import bcrypt from 'bcryptjs';
import { User } from '~/types';

type LoginCredentials = {
  username: string;
  password: string;
};

type UserResponse = {
  id: number;
  username: string;
  email: string | null;
};

export default defineEventHandler(async (event, dbInstance = db) => {
  const body = await readBody(event);
  const { username, password } = body as LoginCredentials;

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: 'Username and password are required',
    });
  }

  try {
    // Normalize username to lowercase for case-insensitive comparison
    const normalizedUsername = username.toLowerCase();
    const user = dbInstance.prepare('SELECT * FROM users WHERE username = ?').get(normalizedUsername) as
      | User
      | undefined;

    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    }

    // Using bcrypt to compare the provided password with the stored hash
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    }

    // Create session and set HTTP-only cookie
    const session = await createSession(dbInstance, user.id);
    setSessionCookie(event, session.id, session.expiresAt);

    const response: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    return response;
  } catch (err) {
    console.error('Login error:', err);

    // If it's already an API error with status code, rethrow it
    if (isApiError(err)) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      message: 'Server error during authentication',
    });
  }
});
