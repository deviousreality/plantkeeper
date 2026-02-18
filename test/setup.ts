import { vi } from 'vitest';
import type { H3Event, EventHandlerRequest } from 'h3';
import Database from 'better-sqlite3';
import { generateForeignKeySeedTestData, generateUserTestData } from '~/server/utils/db';
import { buildTables } from '~/server/utils/db_build';

type Handler = (event: H3Event<EventHandlerRequest>) => Promise<unknown>;

function useDBTestUtils(options: { skipUserSeed?: boolean } = {}) {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  buildTables(db);
  if (!options.skipUserSeed) {
    generateUserTestData(db);
  }
  generateForeignKeySeedTestData(db);
  vi.stubGlobal('db', db);
  return db;
}

function useH3TestUtils() {
  const h3 = vi.hoisted(() => ({
    createError: vi.fn().mockImplementation((options) => {
      const error = new Error(options.message || options.statusMessage || 'Error');
      Object.assign(error, options);
      return error;
    }),
    defineEventHandler: vi.fn((handler: Handler) => {
      return handler;
    }),
    readBody: vi.fn(async (event: H3Event) => {
      if (event._requestBody && typeof event._requestBody === 'string') {
        return JSON.parse(event._requestBody);
      }
      return event._requestBody || {};
    }),
    getRouterParams: vi.fn((event: H3Event) => event.context?.params || {}),
    getQuery: vi.fn((event: H3Event) => event.context?.query || {}),
    readMultipartFormData: vi.fn(),
  }));

  vi.stubGlobal('defineEventHandler', h3.defineEventHandler);
  vi.stubGlobal('readBody', h3.readBody);
  vi.stubGlobal('getRouterParam', h3.getRouterParams);
  vi.stubGlobal('getQuery', h3.getQuery);
  vi.stubGlobal('createError', h3.createError);
  vi.stubGlobal('readMultipartFormData', h3.readMultipartFormData);
  return h3;
}

/**
 * Call this in your test before running code that requires authentication.
 * Example:
 *   mockAuth({ id: 1, username: 'testuser', email: 'test@example.com' })
 */
async function mockAuth(user = { id: 1, username: 'testuser', email: 'test@example.com' }) {
  // Dynamically import to avoid hoisting conflicts with vi.mock()
  const sessionUtils = await import('~/server/utils/session');
  vi.spyOn(sessionUtils, 'getSessionIdFromCookie').mockReturnValue('mock-session-id');
  vi.spyOn(sessionUtils, 'getCurrentUser').mockResolvedValue(user);
  vi.spyOn(sessionUtils, 'requireAuth').mockResolvedValue(user);
}

export { useDBTestUtils, useH3TestUtils, mockAuth };
