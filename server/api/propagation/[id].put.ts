/**
 * API endpoint to update a specific propagation record
 * PUT /api/propagation/[id]
 */
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import type { H3Event } from 'h3';

export async function handler(event: H3Event, dbInstance = db) {
  // Get authenticated user from session
  const user = await requireAuth(dbInstance, event);

  // Get propagation ID from URL
  const id = event.context.params?.id;
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Propagation ID is required',
    });
  }

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

  // Verify propagation record exists and user owns the plant
  const existingPropagation = dbInstance
    .prepare(
      `
      SELECT pp.id
      FROM plant_propagation pp
      JOIN plants p ON pp.plant_id = p.id
      WHERE pp.id = ? AND p.user_id = ?
    `
    )
    .get(id, user.id);

  if (!existingPropagation) {
    throw createError({
      statusCode: 404,
      message: 'Propagation record not found or you do not have permission to update it',
    });
  }

  // Verify user owns the plant if plant ID has changed
  if (body.plantId) {
    const plant = dbInstance.prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?').get(body.plantId, user.id);

    if (!plant) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to assign this plant',
      });
    }
  }

  // Update propagation record
  dbInstance.prepare(
    `
      UPDATE plant_propagation
      SET 
        plant_id = ?,
        prop_type = ?,
        seed_source = ?,
        cutting_source = ?,
        prop_date = ?,
        initial_count = ?,
        current_count = ?,
        transplant_date = ?,
        notes = ?,
        zero_count_notes = ?
      WHERE id = ?
    `
  ).run(
    body.plantId,
    body.propType,
    body.seedSource || null,
    body.cuttingSource || null,
    body.propDate,
    body.initialCount || null,
    body.currentCount || null,
    body.transplantDate || null,
    body.notes || null,
    body.zeroCountNotes || null,
    id
  );

  // Get updated record
  const updatedPropagation = dbInstance
    .prepare(
      `
      SELECT 
        pp.*,
        p.name as plantName,
        ps.name as species
      FROM plant_propagation pp
      JOIN plants p ON pp.plant_id = p.id
      LEFT JOIN plant_species ps ON p.species_id = ps.id
      WHERE pp.id = ?
    `
    )
    .get(id);

  // Map DB column names to camelCase for frontend
  const record = updatedPropagation as Record<string, any>;
  const mappedPropagation = {
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
    zeroCountNotes: record.zero_count_notes,
  };

  return {
    success: true,
    data: mappedPropagation,
  };
}

export default defineEventHandler((event) => handler(event));
