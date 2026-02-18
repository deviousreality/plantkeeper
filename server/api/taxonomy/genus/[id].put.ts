// server/api/taxonomy/genus/[id].put.ts
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
    const body = await readBody(event);

    if (!body.name || typeof body.name !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Genus name is required',
      });
    }

    const familyId = body.familyId ? parseInt(body.familyId) : null;

    if (!familyId) {
      throw createError({
        statusCode: 400,
        message: 'Family ID is required',
      });
    }

    // Verify family exists
    const familyExists = db
      .prepare(
        `
      SELECT 1 FROM plant_family WHERE id = ?
    `
      )
      .get(familyId);

    if (!familyExists) {
      throw createError({
        statusCode: 400,
        message: 'Referenced family does not exist',
      });
    }

    const result = db
      .prepare(
        `
      UPDATE plant_genus
      SET name = ?, family_id = ?
      WHERE id = ?
    `
      )
      .run(body.name.trim(), familyId, id);

    if (result.changes === 0) {
      throw createError({
        statusCode: 404,
        message: 'Genus not found',
      });
    }

    return {
      id,
      name: body.name.trim(),
      familyId,
    };
  } catch (error) {
    console.error('Error updating genus:', error);
    throw createError({
      statusCode: 500,
      message: 'Server error updating genus',
    });
  }
});
