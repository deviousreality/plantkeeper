/**
 * API endpoint to create a new propagation record
 * POST /api/propagation
 */
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import type { H3Event } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
  try {
    // Get authenticated user from session
    const user = await requireAuth(db, event);

    // Parse request body
    const body = await readBody(event);

    // Validate required fields
    if (!body.plantId) {
      throw createError({
        statusCode: 400,
        message: 'Plant ID is required',
      });
    }

    if (!body.propType) {
      throw createError({
        statusCode: 400,
        message: 'Propagation type is required',
      });
    }

    if (!body.propDate) {
      throw createError({
        statusCode: 400,
        message: 'Propagation date is required',
      });
    }

    // Verify user owns the plant
    const plant = db.prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?').get(body.plantId, user.id);

    if (!plant) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to add propagation records for this plant',
      });
    }

    // Insert propagation record
    const result = db
      .prepare(
        `
      INSERT INTO plant_propagation (
        plant_id, 
        prop_type,
        seed_source, 
        cutting_source, 
        prop_date, 
        initial_count, 
        current_count,
        transplant_date,
        notes,
        zero_cout_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        body.plantId,
        body.propType,
        body.seedSource || null,
        body.cuttingSource || null,
        body.propDate,
        body.initialCount || null,
        body.currentCount || null,
        body.transplantDate || null,
        body.notes || null,
        body.zeroCoutNotes || null
      );

    // Get the newly created record
    const newPropagation = db.prepare('SELECT * FROM plant_propagation WHERE id = ?').get(result.lastInsertRowid);

    // Map DB column names to camelCase for frontend
    const record = newPropagation as Record<string, any>;
    const mappedPropagation = {
      id: record.id,
      plantId: record.plant_id,
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

    return {
      success: true,
      data: mappedPropagation,
    };
  } catch (error) {
    console.error('Error creating propagation record:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Error creating propagation record',
    });
  }
});
