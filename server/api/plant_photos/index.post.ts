// server/api/plant_photos/index.post.ts

import { validatePlantPhotoData } from '~/server/utils/plant_photos.db';
import { db, handleDataTableTransactionError, validateFieldId } from '~/server/utils/db';
import { PlantPhotosMockFile, PlantPhotosTableRowInsert } from '~/types/database';
import { requireAuth } from '~/server/utils/session';
// import { readMultipartFormData } from 'h3';
import type { H3Event } from 'h3';

const handler = async (event: H3Event, dbInstance = db) => {
  const context = 'plant_photos';
  // Require authentication
  await requireAuth(dbInstance, event);
  // Read the multipart form data
  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({
      statusCode: 400,
      message: 'No form data provided',
    });
  }
  // Extract plant_id and file from form data
  const plantIdPart = formData.find((part) => part.name === 'plant_id');
  const filePart = formData.find((part) => part.name === 'image');

  if (!plantIdPart) {
    validateFieldId(plantIdPart);
  }

  if (!filePart) {
    throw createError({
      statusCode: 400,
      message: 'Missing file data in form data',
    });
  }

  // Validate file MIME type — only allow image types
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const fileType = filePart.type || '';
  if (!ALLOWED_MIME_TYPES.includes(fileType)) {
    throw createError({
      statusCode: 400,
      message: `Invalid file type: ${fileType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    });
  }

  // Validate file size — max 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  if (filePart.data.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      message: `File too large: ${filePart.data.length} bytes. Maximum allowed: ${MAX_FILE_SIZE} bytes (10MB)`,
    });
  }

  // Parse plant ID
  let plantId: number;
  try {
    plantId = parseInt(Buffer.from(plantIdPart.data).toString('utf8'));
    if (isNaN(plantId) || plantId <= 0) {
      throw new Error('Invalid plant_id value');
    }
  } catch (err) {
    throw createError({
      statusCode: 400,
      message: 'Invalid plant_id: must be a positive integer',
    });
  }

  // Construct a mock File object that our processing functions can use
  const mockFile: PlantPhotosMockFile = {
    plant_id: plantId,
    file: {
      name: filePart.filename || 'unknown.jpg',
      type: filePart.type || 'image/jpeg',
      size: filePart.data.length,
      lastModified: Date.now(),
      arrayBuffer: async () => Promise.resolve(filePart.data.buffer),
      slice: () => new Blob(),
      stream: () => new ReadableStream(),
      text: async () => Promise.resolve(''),
    } as File,
  };

  validateFieldId(mockFile.plant_id);

  const plantPhotoData = await validatePlantPhotoData(mockFile);

  // Use transaction to ensure tables are updated

  try {
    dbInstance.exec('BEGIN TRANSACTION;');

    const insert = dbInstance.prepare(
      `
      INSERT INTO plant_photos (plant_id, filename, image, mime_type, size_type, guid)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    );

    const insertMany = dbInstance.transaction((photos: PlantPhotosTableRowInsert[]) => {
      for (const photo of photos) {
        // Extract only the fields we're inserting (excluding created_at which has a default)
        const values = [photo.plant_id, photo.filename, photo.image, photo.mime_type, photo.size_type, photo.guid];
        insert.run(...values);
      }
    });

    insertMany(plantPhotoData);

    dbInstance.exec('COMMIT');

    // Return success response with some basic information
    return {
      success: true,
      message: 'Plant photo uploaded successfully',
      plant_id: mockFile.plant_id,
    };
  } catch (error: unknown | string) {
    // If we're in a transaction and encounter an error, roll it back
    return handleDataTableTransactionError(dbInstance, error, context, {});
  }
};

export default defineEventHandler((event) => handler(event));

export { handler };
