/**
 * API endpoint to get all propagation records
 * GET /api/propagation
 * Optional query param: plantId to filter by a specific plant
 */
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import type { H3Event } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
  try {
    // Get authenticated user from session
    const user = await requireAuth(db, event);

    // Get query parameters
    const query = getQuery(event);
    const plantId = query.plantId ? Number(query.plantId) : null;

    // Create base query
    let sqlQuery = `
      SELECT 
        pp.*,
        p.name as plantName,
        p.species
      FROM plant_propagation pp
      JOIN plants p ON pp.plant_id = p.id
      WHERE p.user_id = ?
    `;

    // Add plant filter if specified
    const params = [user.id];
    if (plantId) {
      sqlQuery += ` AND pp.plant_id = ?`;
      params.push(plantId);
    }

    // Add order
    sqlQuery += ` ORDER BY pp.prop_date DESC`;

    // Execute query
    const propagations = db.prepare(sqlQuery).all(...params);

    // Map DB column names to camelCase for frontend
    const mappedPropagations = propagations.map((p) => {
      const record = p as Record<string, any>;
      return {
        id: record.id,
        plantId: record.plant_id,
        plantName: record.plantName,
        species: record.species,
        propType: record.prop_type,
        seedSource: record.seed_source,
        cuttingSource: record.cutting_source,
        propDate: record.prop_date,
        initialCount: record.initial_count,
        currentCount: record.current_count,
        transplantDate: record.transplant_date,
        notes: record.notes,
        zeroCoutNotes: record.zero_cout_notes,
      };
    });

    return {
      success: true,
      data: mappedPropagations,
    };
  } catch (error) {
    const apiError = handleError(error, 'Error fetching propagation records');
    throw createError({
      statusCode: apiError.statusCode,
      message: apiError.message,
    });
  }
});
