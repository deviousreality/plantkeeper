// server/api/taxonomy/family/index.get.ts
import { db } from '~/server/utils/db';

export default defineEventHandler(async () => {
  try {
    const families = db
      .prepare(
        `
      SELECT id, name
      FROM plant_family
      ORDER BY name
    `
      )
      .all();

    return families;
  } catch (error) {
    console.error('Error fetching plant families:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Server error fetching plant families',
    });
  }
});
