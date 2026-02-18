// server/api/market-prices/[id].post.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  if (!event.context.params?.id) {
    throw createError({
      statusCode: 400,
      message: 'Plant ID is required',
    });
  }

  const plantId = parseInt(event.context.params.id);

  if (isNaN(plantId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid Plant ID',
    });
  }

  try {
    // Read request body
    const body = await readBody(event);

    if (!body.price || typeof body.price !== 'number') {
      throw createError({
        statusCode: 400,
        message: 'Price is required and must be a number',
      });
    }

    if (!body.dateChecked) {
      body.dateChecked = new Date().toISOString().split('T')[0];
    }

    // Insert the price record
    const result = db
      .prepare(
        `
      INSERT INTO market_price (plant_id, date_checked, price)
      VALUES (?, ?, ?)
    `
      )
      .run(plantId, body.dateChecked, body.price);

    return {
      success: true,
      id: result.lastInsertRowid,
      message: 'Price record created successfully',
    };
  } catch (error) {
    console.error(`Error adding price record for plant ${plantId}:`, error);
    throw createError({
      statusCode: 500,
      message: 'Server error adding price record',
    });
  }
});
