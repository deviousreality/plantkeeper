// server/api/plants/index.get.ts
import { db, handleDatatableFetchError } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import type { PlantTableRow } from '~/types/database';
import { plantTableRowToPlant } from '~/server/utils/plants.db';
import type { H3Event } from 'h3';

export async function handler(event: H3Event, dbInstance = db) {
  const context = 'photos';
  // Get authenticated user from session
  const user = await requireAuth(dbInstance, event);
  const userId = user.id;

  try {
    const PlantTableRows = dbInstance
      .prepare(
        `
      SELECT p.*, 
      --cs.watering_interval, cs.fertilizing_interval, 
      -- cs.last_watered, cs.last_fertilized, cs.light_needs, cs.next_task_date,
      pp.count AS personal_count
      FROM plants p
      -- LEFT JOIN care_schedules cs ON p.id = cs.plant_id
      LEFT JOIN personal_plants pp ON p.id = pp.plant_id
      WHERE p.user_id = ?
      ORDER BY p.is_favorite DESC, p.name
    `
      )
      .all(userId) as PlantTableRow[];

    // Convert all plant rows to proper application types
    const plants = PlantTableRows.map((row) => plantTableRowToPlant(row));

    return plants;
  } catch (error) {
    // console.error('Error fetching plants:', error);
    handleDatatableFetchError(context, error as unknown);
    return null;
  }
}

export default defineEventHandler((event) => handler(event));
