// server/api/plants/[id].get.ts
import { db, handleDatatableFetchError, validateFieldId } from '~/server/utils/db';
import { plantPhotosTableRowsToPlantPhotos } from '~/server/utils/plant_photos.db';
import { PlantPhotosSizeType, PlantPhotosTableRow } from '~/types/database';

import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  const context = 'plant_photos';
  await requireAuth(db, event);
  const plant_id = parseInt(getRouterParam(event, 'id') as string) as number;
  validateFieldId(plant_id);
  try {
    const plantPhotosRows = db
      .prepare(
        `
      SELECT plant_id, filename, image, mime_type, size_type, guid
      FROM plant_photos
      WHERE plant_id = ? AND size_type = ?
      `
      )
      .all(plant_id, PlantPhotosSizeType.Small) as PlantPhotosTableRow[];
    // Convert to application type
    const plantPhotos = plantPhotosTableRowsToPlantPhotos(plantPhotosRows);
    console.log(`Read ${context} from database:`, JSON.stringify(plantPhotos, null, 2));
    return plantPhotos;
    // Get care logs for this plant
  } catch (error) {
    handleDatatableFetchError(context, error as unknown);
  }
});
