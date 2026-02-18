// server/api/plants/[id].put.ts
import { db, validateFieldId } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';
import { mapPlantBodyToDbFields, validateFieldName, validateTaxonomyIds } from '~/server/utils/plants.db';
import type { PlantModelPost } from '~/types/plant-models';
import { getRouterParams, type H3Event } from 'h3';

const handler = async (event: H3Event, dbInstance = db) => {
  const context = 'plants';
  // Get authenticated user from session
  const user = await requireAuth(dbInstance, event);
  const body = (await readBody(event)) as PlantModelPost;
  const params = getRouterParams(event);
  const plant_id = parseInt(params['id'] as string);

  // Override user_id from session
  body.user_id = user.id;

  // console.log('Received plant data:', JSON.stringify(body, null, 2));

  validateFieldId(plant_id);

  validateFieldName(body);

  validateTaxonomyIds(body);

  try {
    // Use transaction to ensure both tables are updated
    dbInstance.exec('BEGIN TRANSACTION');

    const plantData = mapPlantBodyToDbFields(body);

    // console.log('Processed plant data for database:', JSON.stringify(plantData, null, 2));

    const values = Object.values(plantData);
    // console.log('values for database:', JSON.stringify(values, null, 2));
    dbInstance
      .prepare(
        `
      UPDATE plants 
      SET 
      user_id = ?,
      name = ?, 
      species_id = ?, 
      family_id = ?, 
      genus_id = ?, 
      common_name = ?, 
      variety = ?, 
      flower_color = ?, 
      is_personal = ?, 
      is_favorite = ?, 
      acquired_date = ?, 
      notes = ?, 
      light_pref = ?, 
      water_pref = ?, 
      soil_type = ?, 
      plant_zones = ?, 
      plant_use = ?, 
      has_fragrance = ?, 
      fragrance_description = ?, 
      is_petsafe = ?, 
      can_sell = ?, 
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
      `
      )
      .run(...values, plant_id, plantData.user_id);

    // console.log('Updated plant ID:', plant_id);

    // if (plantData.is_personal) {
    //   const personalData = undefinedToNull({
    //     plant_id: plantId,
    //     count: body.personal_count,
    //   });
    //   dbInstance.prepare(
    //     `
    //   UPDATE personal_plants
    //   set count = ?
    //   WHERE plant_id = ?
    //   `
    //   ).run(personalData.count, personalData.plant_id);
    // }

    dbInstance.exec('COMMIT');

    return { success: true, id: plant_id };
  } catch (error) {
    return handleDataTableTransactionError(db, error, context, body);
  }
};

export default defineEventHandler((event) => handler(event));

export { handler };
