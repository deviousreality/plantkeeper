// server/api/taxonomy/species/[id].delete.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const id = parseInt(event.context.params.id);

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Species ID is required',
    });
  }

  try {
    // Delete the species record
    const result = db
      .prepare(
        `
      DELETE FROM plant_species
      WHERE id = ?
    `
      )
      .run(id);

    if (result.changes === 0) {
      throw createError({
        statusCode: 404,
        message: 'Species not found',
      });
    }

    return {
      success: true,
      message: 'Species deleted successfully',
    };
  } catch (error) {
    console.error(`Error deleting species ${id}:`, error);
    throw createError({
      statusCode: 500,
      message: 'Server error deleting species',
    });
  }
});
