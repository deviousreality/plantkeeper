// server/api/plants/index.post.ts
import { db, handleDataTableTransactionError, undefinedToNull } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import { mapPlantBodyToDbFields, validateFieldName, validateTaxonomyIds } from '~/server/utils/plants.db';
import type { PlantTableRow } from '~/types/database';
import type { PlantModelPost } from '~/types/plant-models';
import { plantTableRowToPlant } from '~/server/utils/plants.db';
import type { H3Event } from 'h3';

const handler = async (event: H3Event, dbInstance = db) => {
  const context = 'plants';
  // Get authenticated user from session
  const user = await requireAuth(dbInstance, event);
  const body = (await readBody(event)) as PlantModelPost;

  // Override user_id from session
  body.user_id = user.id;

  validateFieldName(body);
  validateTaxonomyIds(body);

  try {
    dbInstance.exec('BEGIN TRANSACTION');
    const plantData = mapPlantBodyToDbFields(body);
    const values = Object.values(plantData);
    const plantResult = dbInstance
      .prepare(
        `
        INSERT INTO plants (
          user_id, name, species_id, family_id, genus_id, common_name, variety, 
          flower_color, is_personal, is_favorite, acquired_date, notes,
          light_pref, water_pref, soil_type, plant_zones, plant_use, has_fragrance,
          fragrance_description, is_petsafe, can_sell
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(...values);

    const plantId = plantResult.lastInsertRowid;

    if (plantData.is_personal) {
      const personalData = undefinedToNull({
        plant_id: plantId,
        count: body.personal_count,
      });
      dbInstance
        .prepare(
          `
              INSERT INTO personal_plants (
                plant_id, count
              )
              VALUES (?, ?)
            `
        )
        .run(personalData.plant_id, personalData.count);
    }

    dbInstance.exec('COMMIT');

    const PlantTableRow = dbInstance
      .prepare(
        `
        SELECT 
          p.*, 
          pf.name as family_name,
          pg.name as genus_name,
          ps.name as species_name
        FROM plants p
        LEFT JOIN plant_family pf ON p.family_id = pf.id
        LEFT JOIN plant_genus pg ON p.genus_id = pg.id
        LEFT JOIN plant_species ps ON p.species_id = ps.id
        WHERE p.id = ?
      `
      )
      .get(plantId);

    if (!PlantTableRow) {
      throw new Error(`Plant with ID ${plantId} not found after insertion`);
    }

    const plant = plantTableRowToPlant(PlantTableRow as PlantTableRow);
    return plant;
  } catch (error) {
    handleDataTableTransactionError(dbInstance, error, context, body);
    return null;
  }
};

export default defineEventHandler((event) => handler(event));

export { handler };
