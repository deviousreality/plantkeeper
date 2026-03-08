import { db } from '~/server/utils/db';

type TaxonomyItem = {
  id: number;
  name: string;
};

type TaxonomyResponse = {
  families: TaxonomyItem[];
  genera: TaxonomyItem[];
  species: TaxonomyItem[];
};

export default defineEventHandler(async (event): Promise<TaxonomyResponse> => {
  try {
    const query = getQuery(event);
    const familyId = query.familyId ? parseInt(query.familyId as string) : null;
    const genusId = query.genusId ? parseInt(query.genusId as string) : null;

    // Initialize normalized response
    const response: TaxonomyResponse = {
      families: [],
      genera: [],
      species: [],
    };

    // Scenario 1: No IDs provided - return list of families
    if (!familyId && !genusId) {
      response.families = db
        .prepare(
          `
        SELECT id, name
        FROM plant_family
        ORDER BY name
        `
        )
        .all() as TaxonomyItem[];

      return response;
    }

    // Scenario 2: Family ID and Genus ID provided - return family, genus, and species
    if (familyId && genusId) {
      // Get family info
      const family = db
        .prepare(
          `
        SELECT id, name
        FROM plant_family
        WHERE id = ?
        `
        )
        .get(familyId) as TaxonomyItem | undefined;

      if (!family) {
        throw createError({
          statusCode: 404,
          message: 'Family not found',
        });
      }

      // Get genus info and verify it belongs to this family
      const genus = db
        .prepare(
          `
        SELECT id, name, family_id
        FROM plant_genus
        WHERE id = ? AND family_id = ?
        `
        )
        .get(genusId, familyId) as { id: number; name: string; family_id: number } | undefined;

      if (!genus) {
        throw createError({
          statusCode: 404,
          message: 'Genus not found or does not belong to specified family',
        });
      }

      // Get all species in this genus
      const species = db
        .prepare(
          `
        SELECT id, name
        FROM plant_species
        WHERE genus_id = ?
        ORDER BY name
        `
        )
        .all(genusId) as TaxonomyItem[];

      response.species = species;

      return response;
    }

    // Scenario 3: Only Family ID provided - return family and genera in that family
    if (familyId && !genusId) {
      // Get family info
      const family = db
        .prepare(
          `
        SELECT id, name
        FROM plant_family
        WHERE id = ?
      `
        )
        .get(familyId) as TaxonomyItem | undefined;

      if (!family) {
        throw createError({
          statusCode: 404,
          message: 'Family not found',
        });
      }

      // Get all genera in this family
      const genera = db
        .prepare(
          `
        SELECT id, name
        FROM plant_genus
        WHERE family_id = ?
        ORDER BY name
      `
        )
        .all(familyId) as TaxonomyItem[];

      response.genera = genera;

      return response;
    }

    // If we get here, only genusId was provided (invalid scenario)
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters. Provide familyId alone, or familyId with genusId, or no parameters.',
    });
  } catch (error) {
    console.error('Error fetching taxonomy data:', error instanceof Error ? error.message : String(error));

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error; // Re-throw createError errors
    }

    throw createError({
      statusCode: 500,
      message: 'Server error fetching taxonomy data',
    });
  }
});
