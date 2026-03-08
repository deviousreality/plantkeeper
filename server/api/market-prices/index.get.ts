// server/api/market-prices/index.get.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  const user = await requireAuth(db, event);
  const userId = user.id;

  try {
    // Get plants with their latest market price
    const plants = db
      .prepare(
        `
      SELECT p.*, 
        (SELECT json_object('id', mp.id, 'price', mp.price, 'dateChecked', mp.date_checked) 
         FROM market_price mp 
         WHERE mp.plant_id = p.id 
         ORDER BY mp.date_checked DESC 
         LIMIT 1) as latestPrice
      FROM plants p
      WHERE p.user_id = ?
      ORDER BY p.name
    `
      )
      .all(userId);

    // Parse the JSON string in latestPrice
    return plants.map((plant) => ({
      ...plant,
      latestPrice: plant.latestPrice ? JSON.parse(plant.latestPrice) : null,
    }));
  } catch (error) {
    console.error('Error fetching plants with market prices:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Server error fetching plants with market prices',
    });
  }
});
