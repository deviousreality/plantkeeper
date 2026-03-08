// server/api/taxonomy/genus/index.get.ts
import { db } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  try {
    const genus = db
      .prepare(
        `
      SELECT id, name, family_id as familyId
      FROM plant_genus
      ORDER BY name
    `
      )
      .all();

    return genus;
  } catch (error) {
    console.error('Error fetching genus entries:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Server error fetching genus entries',
    });
  }
});
