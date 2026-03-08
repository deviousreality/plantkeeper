// server/api/care-tips/index.get.ts
import { db } from '../../utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const query = getQuery(event);
  const search = query.search?.toString();

  try {
    let tips;

    if (search) {
      // Search for tips by species or content
      tips = db
        .prepare(
          `
        SELECT id, species, tip, source, created_at
        FROM care_tips
        WHERE species LIKE ? OR tip LIKE ?
        ORDER BY species, id
      `
        )
        .all(`%${search}%`, `%${search}%`);
    } else {
      // Get all tips
      tips = db
        .prepare(
          `
        SELECT id, species, tip, source, created_at
        FROM care_tips
        ORDER BY species, id
      `
        )
        .all();
    }

    return tips;
  } catch (error) {
    console.error('Error fetching care tips:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch care tips.',
    });
  }
});
