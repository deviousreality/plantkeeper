// server/api/taxonomy/genus/index.post.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
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
      INSERT INTO plant_genus (name, family_id)
      VALUES (?, ?)
    `
      )
      .run(body.name.trim(), familyId);

    return {
      id: result.lastInsertRowid,
      name: body.name.trim(),
      familyId,
    };
  } catch (error) {
    console.error('Error creating genus:', error);
    throw createError({
      statusCode: 500,
      message: 'Server error creating genus',
    });
  }
});
