// server/api/auth/logout.post.ts
import { getSessionIdFromCookie, deleteSession, clearSessionCookie } from '~/server/utils/session';
import { db } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const sessionId = getSessionIdFromCookie(event);

  if (sessionId) {
    await deleteSession(db, sessionId);
  }

  clearSessionCookie(event);

  return { success: true };
});
