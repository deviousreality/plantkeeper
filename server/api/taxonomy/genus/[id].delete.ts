// server/api/taxonomy/genus/[id].delete.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const id = parseInt(event.context.params.id);

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Genus ID is required',
    });
  }

  try {
    // Delete the genus record
    const result = db
      .prepare(
        `
      DELETE FROM plant_genus
      WHERE id = ?
    `
      )
      .run(id);

    if (result.changes === 0) {
      throw createError({
        statusCode: 404,
        message: 'Genus not found',
      });
    }

    return {
      success: true,
      message: 'Genus deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting genus:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Server error deleting genus',
    });
  }
});
