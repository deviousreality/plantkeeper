// server/api/taxonomy/species/[id].put.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const id = parseInt(event.context.params?.['id'] as string);

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Species ID is required',
    });
  }

  try {
    const body = await readBody(event);

    if (!body.name || typeof body.name !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Species name is required',
      });
    }

    const genusId = body.genusId ? parseInt(body.genusId) : null;

    if (genusId) {
      // Verify genus exists
      const genusExists = db
        .prepare(
          `
        SELECT 1 FROM plant_genus WHERE id = ?
      `
        )
        .get(genusId);

      if (!genusExists) {
        throw createError({
          statusCode: 400,
          message: 'Referenced genus does not exist',
        });
      }
    }

    const result = db
      .prepare(
        `
      UPDATE plant_species 
      SET name = ?, genus_id = ?
      WHERE id = ?
    `
      )
      .run(body.name.trim(), genusId, id);

    if (result.changes === 0) {
      throw createError({
        statusCode: 404,
        message: 'Species not found',
      });
    }

    return {
      id,
      name: body.name.trim(),
      genusId,
    };
  } catch (error) {
    console.error(`Error updating species ${id}:`, error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Server error updating species',
    });
  }
});
