// server/api/personal/index.post.ts
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import type { CreatePersonalPlant } from '~/types/database';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const body = (await readBody(event)) as CreatePersonalPlant;
  console.log('Received personal plant data:', JSON.stringify(body, null, 2));

  const { plant_id, count, zero_reason, container_type } = body;

  if (!plant_id) {
    throw createError({
      statusCode: 400,
      message: 'Plant ID is required',
    });
  }

  // Validate that the plant exists
  const plant = db.prepare('SELECT id FROM plants WHERE id = ?').get(plant_id);
  if (!plant) {
    throw createError({
      statusCode: 404,
      message: `Plant with ID ${plant_id} does not exist`,
    });
  }

  try {
    // Insert personal plant record
    const personalData = {
      plant_id: plant_id,
      count: count ?? 1,
      zero_reason: zero_reason ?? null,
      container_type: container_type ?? null,
    };

    console.log('Processed personal plant data for database:', JSON.stringify(personalData, null, 2));

    const personalResult = db
      .prepare(
        `
      INSERT INTO personal_plants (
        plant_id, count, zero_reason, container_type
      )
      VALUES (?, ?, ?, ?)
    `
      )
      .run(personalData.plant_id, personalData.count, personalData.zero_reason, personalData.container_type);

    const personalId = personalResult.lastInsertRowid;
    console.log('Inserted personal plant ID:', personalId);

    // Return the created personal plant record
    const createdPersonal = db.prepare('SELECT * FROM personal_plants WHERE id = ?').get(personalId);

    return createdPersonal;
  } catch (error) {
    console.error('Error creating personal plant:', error);
    throw createError({
      statusCode: 500,
      message: `Server error creating personal plant: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});
