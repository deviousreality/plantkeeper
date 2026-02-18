import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import { useDBTestUtils, useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import { Database } from 'better-sqlite3';
import { Plant } from '~/types';
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

describe('GET /api/plants', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  beforeEach(() => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils();
  });

  afterEach(() => {
    dbInstance.close();
  });

  const handler = await import('../index.get');

  it('return rows for valid request', async () => {
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

    const event = createMockH3Event({
      body: {},
      query: { userId: '1' },
    });

    const response = (await handler.handler(event, dbInstance)) as Plant[];

    expect(response.length).toBeGreaterThan(0);
  });

  it('should return 500 if userId is missing', async () => {
    const event = createMockH3Event({
      body: {},
    });
    try {
      await handler.handler(event, dbInstance);
    } catch (error) {
      await expect(error as H3Error).toMatchObject({
        statusCode: 500,
        message: 'User ID is required',
      });
    }
  });
});
