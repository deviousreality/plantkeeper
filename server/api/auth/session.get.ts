// server/api/auth/session.get.ts
import { getCurrentUser } from '~/server/utils/session';
import { db } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(db, event);

  // Return null instead of throwing error to avoid console warnings
  return user || null;
});
