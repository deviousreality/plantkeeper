// server/api/market-prices/[id]/[priceId].delete.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const plantId = parseInt(event.context.params.id);
  const priceId = parseInt(event.context.params.priceId);

  if (!plantId || !priceId) {
    throw createError({
      statusCode: 400,
      message: 'Plant ID and Price ID are required',
    });
  }

  try {
    // Delete the price record (making sure it belongs to this plant)
    const result = db
      .prepare(
        `
      DELETE FROM market_price
      WHERE id = ? AND plant_id = ?
    `
      )
      .run(priceId, plantId);

    if (result.changes === 0) {
      throw createError({
        statusCode: 404,
        message: 'Price record not found or does not belong to this plant',
      });
    }

    return {
      success: true,
      message: 'Price record deleted successfully',
    };
  } catch (error) {
    console.error(
      `Error deleting price record ${priceId} for plant ${plantId}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw createError({
      statusCode: 500,
      message: 'Server error deleting price record',
    });
  }
});
