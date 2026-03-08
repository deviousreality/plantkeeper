// server/api/care-tips/[id].delete.ts
import { db } from '../../utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const tipId = getRouterParam(event, 'id');

  if (!tipId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Care tip ID is required.',
    });
  }

  try {
    db.prepare('DELETE FROM care_tips WHERE id = ?').run(tipId);

    return { success: true };
  } catch (error) {
    console.error('Error deleting care tip:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete care tip.',
    });
  }
});
