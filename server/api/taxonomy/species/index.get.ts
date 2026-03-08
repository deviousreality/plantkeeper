// server/api/taxonomy/species/index.get.ts
import { db } from '~/server/utils/db';

export default defineEventHandler(async () => {
  try {
    const species = db
      .prepare(
        `
      SELECT id, name, genus_id as genusId, common_name as commonName
      FROM plant_species 
      ORDER BY name
    `
      )
      .all();

    return species;
  } catch (error) {
    console.error('Error fetching species:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Server error fetching species',
    });
  }
});
