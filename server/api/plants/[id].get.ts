// server/api/plants/[id].get.ts
import { db, handleDatatableFetchError, nullToUndefined, validateFieldId } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import type { PlantTableRow } from '~/types/database';
import { plantTableRowToPlant } from '~/server/utils/plants.db';
import { getRouterParams, type H3Event } from 'h3';

const handler = async (event: H3Event, dbInstance = db) => {
  const context = 'photos';
  // Get authenticated user from session
  const user = await requireAuth(dbInstance, event);
  const params = getRouterParams(event);
  const plant_id = parseInt(params['id'] as string);

  validateFieldId(plant_id);

  try {
    const PlantTableRow = dbInstance
      .prepare(
        `
      SELECT p.*, 
      --cs.watering_interval, cs.fertilizing_interval, 
      --cs.last_watered, cs.last_fertilized, cs.light_needs, cs.next_task_date,
      pp.count AS personal_count
      FROM plants p
      --LEFT JOIN care_schedules cs ON p.id = cs.plant_id
      LEFT JOIN personal_plants pp ON p.id = pp.plant_id
      WHERE p.id = ?
    `
      )
      .get(plant_id) as PlantTableRow;

    if (!PlantTableRow) {
      throw createError({
        statusCode: 404,
        message: 'Plant not found',
      });
    }

    // Verify the authenticated user owns this plant
    if (PlantTableRow.user_id !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Not authorized to view this plant',
      });
    }

    // Convert to application type
    const plant = plantTableRowToPlant(PlantTableRow);

    // Get care logs for this plant
    const careLogsRaw = dbInstance
      .prepare(
        `
      SELECT * FROM care_logs
      WHERE plant_id = ?
      ORDER BY action_date DESC
    `
      )
      .all(plant_id);

    // Get care tips for this plant species
    const careTipsRaw = dbInstance
      .prepare(
        `
      SELECT * FROM care_tips
      WHERE species = ?
      LIMIT 5
    `
      )
      .all(plant.species_id);

    // Convert nulls to undefined for consistency
    const careLogs = nullToUndefined(careLogsRaw);
    const careTips = nullToUndefined(careTipsRaw);

    return {
      ...plant,
      careLogs,
      careTips,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    handleDatatableFetchError(context, error as unknown);
  }
  return null;
};

export default defineEventHandler((event) => handler(event));

export { handler };
