// server/api/taxonomy/species/index.post.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  try {
    const body = await readBody(event);

    if (!body.name || typeof body.name !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Species name is required',
      });
    }

    const genusId = body.genusId ? parseInt(body.genusId) : null;

    if (!genusId) {
      throw createError({
        statusCode: 400,
        message: 'Genus ID is required',
      });
    }

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

    const result = db
      .prepare(
        `
      INSERT INTO plant_species (name, genus_id)
      VALUES (?, ?)
    `
      )
      .run(body.name.trim(), genusId);

    return {
      id: result.lastInsertRowid,
      name: body.name.trim(),
      genusId,
    };
  } catch (error) {
    console.error('Error creating species:', error);
    throw createError({
      statusCode: 500,
      message: 'Server error creating species',
    });
  }
});
