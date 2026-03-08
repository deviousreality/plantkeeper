/**
 * API endpoint to get details of a specific propagation record
 * GET /api/propagation/[id]
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

  // Fetch propagation record with plant information
  const propagation = dbInstance
    .prepare(
      `
      SELECT 
        pp.*,
        p.name as plantName,
        ps.name as species
      FROM plant_propagation pp
      JOIN plants p ON pp.plant_id = p.id
      LEFT JOIN plant_species ps ON p.species_id = ps.id
      WHERE pp.id = ? AND p.user_id = ?
    `
    )
    .get(id, user.id);

  if (!propagation) {
    throw createError({
      statusCode: 404,
      message: 'Propagation record not found',
    });
  }

  // Map DB column names to camelCase for frontend
  const record = propagation as Record<string, any>;
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
