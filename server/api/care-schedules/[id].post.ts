// server/api/care-schedules/[id].post.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import type { H3Event } from 'h3';

const handler = async (event: H3Event, dbInstance = db) => {
  // Get authenticated user from session
  const user = await requireAuth(dbInstance, event);
  const plantId = parseInt(event.context.params.id);

  if (!plantId) {
    throw createError({
      statusCode: 400,
      message: 'Plant ID is required',
    });
  }

  // Verify plant exists and user owns it
  const plant = dbInstance.prepare('SELECT user_id FROM plants WHERE id = ?').get(plantId) as
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
      message: "Not authorized to modify this plant's schedule",
    });
  }

  try {
    const body = await readBody(event);

    // Check if a schedule already exists for this plant
    const existingSchedule = dbInstance
      .prepare(
        `
      SELECT id FROM care_schedules WHERE plant_id = ?
    `
      )
      .get(plantId);

    let result;

    // Calculate the next task date (earlier of watering or fertilizing)
    let nextTaskDate = null;

    if (body.wateringInterval && body.lastWatered) {
      const lastWatered = new Date(body.lastWatered);
      const nextWatering = new Date(lastWatered);
      nextWatering.setDate(nextWatering.getDate() + parseInt(body.wateringInterval));
      nextTaskDate = nextWatering.toISOString().split('T')[0];
    }

    if (body.fertilizingInterval && body.lastFertilized) {
      const lastFertilized = new Date(body.lastFertilized);
      const nextFertilizing = new Date(lastFertilized);
      nextFertilizing.setDate(nextFertilizing.getDate() + parseInt(body.fertilizingInterval));
      const nextFertilizingDate = nextFertilizing.toISOString().split('T')[0];

      if (!nextTaskDate || nextFertilizingDate < nextTaskDate) {
        nextTaskDate = nextFertilizingDate;
      }
    }

    if (existingSchedule) {
      // Update existing schedule
      result = dbInstance
        .prepare(
          `
        UPDATE care_schedules
        SET watering_interval = ?, fertilizing_interval = ?,
            last_watered = ?, last_fertilized = ?,
            light_needs = ?, next_task_date = ?
        WHERE plant_id = ?
      `
        )
        .run(
          body.wateringInterval,
          body.fertilizingInterval,
          body.lastWatered,
          body.lastFertilized,
          body.lightNeeds,
          nextTaskDate,
          plantId
        );
    } else {
      // Create new schedule
      result = dbInstance
        .prepare(
          `
        INSERT INTO care_schedules
        (plant_id, watering_interval, fertilizing_interval, last_watered, last_fertilized, light_needs, next_task_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          plantId,
          body.wateringInterval,
          body.fertilizingInterval,
          body.lastWatered,
          body.lastFertilized,
          body.lightNeeds,
          nextTaskDate
        );
    }

    // Get the updated care schedule
    const updatedSchedule = dbInstance
      .prepare(
        `
      SELECT * FROM care_schedules
      WHERE plant_id = ?
    `
      )
      .get(plantId);

    return {
      success: true,
      id: existingSchedule ? existingSchedule.id : result.lastInsertRowid,
      data: updatedSchedule,
      message: existingSchedule ? 'Care schedule updated' : 'Care schedule created',
    };
  } catch (error) {
    console.error(
      `Error saving care schedule for plant ${plantId}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw createError({
      statusCode: 500,
      message: 'Server error saving care schedule',
    });
  }
};

export default defineEventHandler((event) => handler(event));

export { handler };
