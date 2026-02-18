// server/api/taxonomy/family/[id].put.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const idParam = event.context.params?.['id'];
  const id = idParam ? parseInt(idParam) : null;

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Family ID is required',
    });
  }

  try {
    const body = await readBody(event);

    if (!body.name || typeof body.name !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Family name is required',
      });
    }

    // Check if another family with the same name already exists
    const existingFamily = db
      .prepare(
        `
      SELECT id FROM plant_family WHERE name = ? AND id != ?
    `
      )
      .get(body.name.trim(), id);

    if (existingFamily) {
      throw createError({
        statusCode: 409,
        message: 'Family with this name already exists',
      });
    }

    const result = db
      .prepare(
        `
      UPDATE plant_family
      SET name = ?
      WHERE id = ?
    `
      )
      .run(body.name.trim(), id);

    if (result.changes === 0) {
      throw createError({
        statusCode: 404,
        message: 'Family not found',
      });
    }

    return {
      id,
      name: body.name.trim(),
    };
  } catch (error) {
    console.error(`Error updating family ${id}:`, error);
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: 'Server error updating family',
    });
  }
});
