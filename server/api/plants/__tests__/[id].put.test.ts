import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import { useDBTestUtils, useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import { Database } from 'better-sqlite3';
import { Plant, PlantModelPost } from '~/types';
import type { H3Error } from 'h3';
// Mock session authentication
vi.mock('~/server/utils/session', () => ({
  requireAuth: vi.fn((db, event) =>
    Promise.resolve({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
    })
  ),
}));
describe('PUT /api/plants/:id', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  beforeEach(() => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils();
  });

  afterEach(() => {
    dbInstance.close();
  });
  const handler = await import('../[id].put');

  it('updates an existing plant for valid request', async () => {
    // Insert a plant to update
    const insertStmt = dbInstance.prepare(
      `INSERT INTO plants (user_id, name, species_id, family_id, genus_id, common_name, variety, flower_color, is_personal, is_favorite, acquired_date, notes, light_pref, water_pref, soil_type, plant_zones, plant_use, has_fragrance, fragrance_description, is_petsafe, can_sell) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertStmt.run(
      1,
      'Original Plant',
      null,
      null,
      null,
      'Original Common Name',
      'Original Variety',
      'Blue',
      1,
      1,
      '2023-01-01',
      'Original notes',
      'Shade',
      'Low',
      'Sandy',
      '3-7',
      'Edible',
      0,
      'Sweet',
      0,
      1
    );
    // Get the inserted plant's ID
    const plantId = (dbInstance.prepare('SELECT last_insert_rowid() as id').get() as Plant).id;

    const newPlantData = {
      user_id: 1,
      name: 'Test Plant',
      species_id: undefined,
      family_id: undefined,
      genus_id: undefined,
      common_name: 'Test Plant',
      variety: 'Test Variety',
      flower_color: 'Green',
      is_personal: true,
      is_favorite: false,
      acquired_date: '2024-01-01',
      notes: 'This is a test plant.',
      light_pref: 'Full Sun',
      water_pref: 'Moderate',
      soil_type: 'Loamy',
      plant_zones: '5-9',
      plant_use: 'Ornamental',
      has_fragrance: false,
      fragrance_description: '',
      is_petsafe: true,
      can_sell: false,
    } as unknown as PlantModelPost;
    const event = createMockH3Event({
      body: newPlantData,
      params: { id: plantId?.toString() ?? '' },
    });

    const response = (await handler.handler(event, dbInstance)) as { success: boolean; id: number };

    expect(response).toBeDefined();
  });

  it('should return 500 if plantId is missing', async () => {
    const event = createMockH3Event({
      params: { id: '' },
    });

    try {
      await handler.handler(event, dbInstance);
    } catch (error) {
      await expect(error as H3Error).toMatchObject({
        statusCode: 500,
        message: 'Valid plant ID is required',
      });
    }
  });

  it('should return 500 if invalid name field', async () => {
    const event = createMockH3Event({
      params: { id: '1' },
    });

    try {
      await handler.default(event);
    } catch (error) {
      await expect(error as H3Error).toMatchObject({
        statusCode: 500,
        message: 'Plant name is required and cannot be empty',
      });
    }
  });

  it('should return 500 if invalid family_id name field', async () => {
    const event = createMockH3Event({
      body: {
        name: 'Valid Name',
        family_id: 0,
      },
      params: { id: '1' },
    });

    try {
      await handler.handler(event, dbInstance);
    } catch (error) {
      await expect(error as H3Error).toMatchObject({
        statusCode: 500,
        message: 'Family with ID 0 does not exist',
      });
    }
  });

  it('should return 500 if invalid genus_id name field', async () => {
    const event = createMockH3Event({
      body: {
        name: 'Valid Name',
        family_id: 1,
        genus_id: 0,
      },
      params: { id: '1' },
    });

    try {
      await handler.handler(event, dbInstance);
    } catch (error) {
      await expect(error as H3Error).toMatchObject({
        statusCode: 500,
        message: 'Genus with ID 0 does not exist',
      });
    }
  });

  it('should return 500 if invalid species_id name field', async () => {
    const event = createMockH3Event({
      body: {
        name: 'Valid Name',
        family_id: 1,
        genus_id: 1,
        species_id: 0,
      },
      params: { id: '1' },
    });

    try {
      await handler.handler(event, dbInstance);
    } catch (error) {
      await expect(error as H3Error).toMatchObject({
        statusCode: 500,
        message: 'Species with ID 0 does not exist',
      });
    }
  });
});
