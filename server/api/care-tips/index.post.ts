// server/api/care-tips/index.post.ts
import { db } from '../../utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const body = await readBody(event);

  if (!body.species || !body.tip) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Species and tip content are required.',
    });
  }

  try {
    const result = db
      .prepare(
        `
      INSERT INTO care_tips (species, tip, source)
      VALUES (?, ?, ?)
    `
      )
      .run(body.species, body.tip, body.source || null);

    // Return the newly created tip
    const newTip = db
      .prepare(
        `
      SELECT id, species, tip, source, created_at
      FROM care_tips
      WHERE id = ?
    `
      )
      .get(result.lastInsertRowid);

    return newTip;
  } catch (error) {
    console.error('Error creating care tip:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create care tip.',
    });
  }
});
