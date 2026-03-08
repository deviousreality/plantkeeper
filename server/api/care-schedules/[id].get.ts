// server/api/care-schedules/[id].get.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  // Get authenticated user from session
  const user = await requireAuth(db, event);
  const plantId = parseInt(event.context.params.id);

  if (!plantId) {
    throw createError({
      statusCode: 400,
      message: 'Plant ID is required',
    });
  }

  try {
    // Verify plant ownership before returning schedule
    const plant = db.prepare('SELECT user_id FROM plants WHERE id = ?').get(plantId) as { user_id: number } | undefined;
    if (!plant) {
      throw createError({
        statusCode: 404,
        message: 'Plant not found',
      });
    }
    if (plant.user_id !== user.id) {
      throw createError({
        statusCode: 403,
        message: "Not authorized to access this plant's schedule",
      });
    }
    // Get the care schedule for this plant
    const schedule = db
      .prepare(
        `
      SELECT * FROM care_schedules
      WHERE plant_id = ?
    `
      )
      .get(plantId);

    return schedule || null;
  } catch (error) {
    console.error(
      `Error fetching care schedule for plant ${plantId}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw createError({
      statusCode: 500,
      message: 'Server error fetching care schedule',
    });
  }
});
