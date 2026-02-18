// server/api/taxonomy/family/index.post.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  try {
    const body = await readBody(event);

    if (!body.name || typeof body.name !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Family name is required',
      });
    }

    // Check if family already exists
    const existingFamily = db
      .prepare(
        `
      SELECT id FROM plant_family WHERE name = ?
    `
      )
      .get(body.name.trim());

    if (existingFamily) {
      throw createError({
        statusCode: 409,
        message: 'Family with this name already exists',
      });
    }

    const result = db
      .prepare(
        `
      INSERT INTO plant_family (name)
      VALUES (?)
    `
      )
      .run(body.name.trim());

    return {
      id: result.lastInsertRowid,
      name: body.name.trim(),
    };
  } catch (error) {
    console.error('Error creating plant family:', error);
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: 'Server error creating plant family',
    });
  }
});
