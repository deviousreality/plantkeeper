/**
 * API endpoint to get propagation records for a specific plant
 * GET /api/plants/[id]/propagation
 */
import { db, nullToUndefined } from '~/server/utils/db';
import type { H3Event } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
  try {
    // Get user ID from auth
    const user = event.context.user;
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      });
    }

    // Get plant ID from URL
    const plantId = event.context.params?.id;
    if (!plantId) {
      throw createError({
        statusCode: 400,
        message: 'Plant ID is required',
      });
    }

    // Verify user owns the plant
    const plant = db.prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?').get(plantId, user.id);

    if (!plant) {
      throw createError({
        statusCode: 404,
        message: 'Plant not found or you do not have permission to access it',
      });
    }

    // Get propagation records for this plant
    const propagationsRaw = db
      .prepare(
        `
      SELECT * FROM plant_propagation
      WHERE plant_id = ?
      ORDER BY prop_date DESC
    `
      )
      .all(plantId);

    // Convert nulls to undefined and map DB column names to camelCase for frontend
    const propagations = nullToUndefined(propagationsRaw).map((p: any) => ({
      id: p.id,
      plantId: p.plant_id,
      propType: p.prop_type,
      seedSource: p.seed_source,
      cuttingSource: p.cutting_source,
      propDate: p.prop_date,
      initialCount: p.initial_count,
      currentCount: p.current_count,
      transplantDate: p.transplant_date,
      notes: p.notes,
      zeroCoutNotes: p.zero_cout_notes,
    }));

    return {
      success: true,
      data: propagations,
    };
  } catch (error) {
    console.error('Error fetching plant propagation records:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Error fetching plant propagation records',
    });
  }
});
