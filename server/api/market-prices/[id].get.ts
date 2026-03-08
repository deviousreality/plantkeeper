// server/api/market-prices/[id].get.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const plantId = parseInt(event.context.params.id);

  if (!plantId) {
    throw createError({
      statusCode: 400,
      message: 'Plant ID is required',
    });
  }

  try {
    // Get all price records for this plant
    const priceRecords = db
      .prepare(
        `
      SELECT id, plant_id as plantId, date_checked as dateChecked, price
      FROM market_price
      WHERE plant_id = ?
      ORDER BY date_checked DESC
    `
      )
      .all(plantId);

    return priceRecords;
  } catch (error) {
    console.error(
      `Error fetching price records for plant ${plantId}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw createError({
      statusCode: 500,
      message: 'Server error fetching price records',
    });
  }
});
