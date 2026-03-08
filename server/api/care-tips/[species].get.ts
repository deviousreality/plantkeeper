// server/api/care-tips/[species].get.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const species = event.context.params?.species;

  if (!species) {
    throw createError({
      statusCode: 400,
      message: 'Plant species is required',
    });
  }

  try {
    const tips = db
      .prepare(
        `
      SELECT * FROM care_tips
      WHERE species = ?
      ORDER BY created_at DESC
    `
      )
      .all(species);

    return tips;
  } catch (error) {
    console.error('Error fetching care tips:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Server error fetching care tips',
    });
  }
});
