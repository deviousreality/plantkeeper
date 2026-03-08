// server/api/taxonomy/family/[id].delete.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const id = parseInt(event.context.params.id);

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Family ID is required',
    });
  }

  try {
    // Delete the family record
    const result = db
      .prepare(
        `
      DELETE FROM plant_family
      WHERE id = ?
    `
      )
      .run(id);

    if (result.changes === 0) {
      throw createError({
        statusCode: 404,
        message: 'Family not found',
      });
    }

    return {
      success: true,
      message: 'Family deleted successfully',
    };
  } catch (error) {
    console.error(`Error deleting family ${id}:`, error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Server error deleting family',
    });
  }
});
