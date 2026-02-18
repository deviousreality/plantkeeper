// server/api/plants/[id].delete.ts
import { db, handleDataTableTransactionError, validateFieldId } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import { getRouterParams, type H3Event } from 'h3';

const handler = async (event: H3Event, dbInstance = db) => {
  const context = 'plants';
  // Get authenticated user from session
  const user = await requireAuth(dbInstance, event);
  const params = getRouterParams(event);
  const plant_id = parseInt(params['id'] as string);

  validateFieldId(plant_id);

  // Verify plant ownership
  const plant = dbInstance.prepare('SELECT user_id FROM plants WHERE id = ?').get(plant_id) as
    | { user_id: number }
    | undefined;
  if (!plant) {
    throw createError({
      statusCode: 404,
      message: 'Plant not found',
    });
  }
  if (plant.user_id !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Not authorized to delete this plant',
    });
  }

  try {
    // Start a transaction to delete related records first
    const transaction = dbInstance.transaction(() => {
      // Delete care logs
      dbInstance.prepare('DELETE FROM care_logs WHERE plant_id = ?').run(plant_id);

      // Delete care schedule
      dbInstance.prepare('DELETE FROM care_schedules WHERE plant_id = ?').run(plant_id);

      // Delete plant
      dbInstance.prepare('DELETE FROM plants WHERE id = ?').run(plant_id);
    });

    transaction();

    return { success: true };
  } catch (error) {
    handleDataTableTransactionError(dbInstance, error, context, '');
    return null;
  }
};

export default defineEventHandler((event) => handler(event));

export { handler };
