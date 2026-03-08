// server/api/plants/[id]/photos.get.ts
import { db } from '~/server/utils/db';
import { PlantPhotosSizeType, PlantPhotosTableRow } from '~/types';

export default defineEventHandler(async (event) => {
  const plant_id = parseInt(getRouterParam(event, 'id') as string) as number;

  validateFieldId(plant_id);

  try {
    // Fetch photos for the plant (only small size for thumbnails)
    const plantPhotosRows = db
      .prepare(
        `
        SELECT * 
        FROM plant_photos
        WHERE plant_id = ? AND size_type = ?
        ORDER BY created_at DESC
      `
      )
      .all(plant_id, PlantPhotosSizeType.Small) as PlantPhotosTableRow[];

    const plantPhotos = plantPhotosTableRowsToPlantPhotos(plantPhotosRows);

    // Convert the photos to base64 for frontend display
    const processedPhotos = plantPhotos.map((plantPhoto: any) => {
      // Debug: Check what we got from the database

      // If the image is stored as a Buffer, convert it to base64
      let base64Image = '';
      if (plantPhoto.image && Buffer.isBuffer(plantPhoto.image)) {
        base64Image = `data:${plantPhoto.mime_type};base64,${plantPhoto.image.toString('base64')}`;
      } else {
      }

      return {
        id: plantPhoto.id,
        plant_id: plantPhoto.plant_id,
        filename: plantPhoto.filename,
        image: base64Image,
        mime_type: plantPhoto.mime_type,
        size_type: plantPhoto.size_type,
        created_at: plantPhoto.created_at,
      };
    });

    return {
      photos: processedPhotos,
    };
  } catch (error) {
    console.error('Error fetching plant photos:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch plant photos',
    });
  }
});
