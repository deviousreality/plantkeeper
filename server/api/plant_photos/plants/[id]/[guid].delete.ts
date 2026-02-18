import { db, validateFieldId } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  const context = 'plant_photos';
  await requireAuth(db, event);
  const plantId = parseInt(getRouterParam(event, 'id') as string) as number;
  const guid = getRouterParam(event, 'guid') as string;

  validateFieldId(plantId);

  if (!guid) {
    throw createError({
      statusCode: 400,
      message: 'Missing photo GUID',
    });
  }
  try {
    // First check if the photo exists and belongs to the specified plant
    const id = db.prepare('SELECT id FROM plant_photos WHERE guid = ? AND plant_id = ?').get(guid, plantId);

    if (!id) {
      throw createError({
        statusCode: 404,
        message: 'Photo not found or does not belong to this plant',
      });
    }

    // Delete the photo
    const result = db.prepare('DELETE FROM plant_photos WHERE guid = ? AND plant_id = ?').run(guid, plantId);

    if (result.changes === 0) {
      throw createError({
        statusCode: 500,
        message: 'Failed to delete photo',
      });
    }

    return {
      success: true,
      message: 'Photo deleted successfully',
    };
  } catch (error) {
    handleDatatableFetchError(context, error as unknown);
  }
});
