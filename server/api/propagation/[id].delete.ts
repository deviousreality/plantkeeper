/**
 * API endpoint to delete a specific propagation record
 * DELETE /api/propagation/[id]
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
      message: 'Propagation record not found or you do not have permission to delete it',
    });
  }

  // Delete propagation record
  dbInstance.prepare('DELETE FROM plant_propagation WHERE id = ?').run(id);

  return {
    success: true,
    message: 'Propagation record deleted successfully',
  };
}

export default defineEventHandler((event) => handler(event));
