import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import { useDBTestUtils, useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import { type Database } from 'better-sqlite3';
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

describe('GET /api/plants[id]', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  beforeEach(() => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils();
  });

  afterEach(() => {
    dbInstance.close();
  });

  const handler = await import('../[id].get');

  it('returns row for valid request', async () => {
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
      params: { id: '1' },
    });

    const response = (await handler.handler(event, dbInstance)) as Plant;

    expect(response).toBeDefined();
  });

  it('should return 500 if plantId is missing', async () => {
    const event = createMockH3Event({
      body: {},
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

  it('should return 403 if plant belongs to another user', async () => {
    // Insert a user with id=2
    dbInstance
      .prepare('INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)')
      .run(2, 'otheruser', 'password', 'other@example.com');

    // Insert a plant owned by user 2
    dbInstance
      .prepare(
        `INSERT INTO plants (user_id, name, common_name, is_personal, is_favorite, has_fragrance, is_petsafe, can_sell) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(2, 'Other Plant', 'Other Common', 0, 0, 0, 0, 0);

    const plantRow = dbInstance.prepare('SELECT id FROM plants WHERE user_id = 2').get() as { id: number };

    const event = createMockH3Event({
      body: {},
      params: { id: String(plantRow.id) },
    });

    // The mock requireAuth returns user id=1, but the plant belongs to user id=2
    try {
      await handler.handler(event, dbInstance);
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error as H3Error).toMatchObject({
        statusCode: 403,
        message: 'Not authorized to view this plant',
      });
    }
  });

  it('should return plant when user owns it', async () => {
    // Insert a plant owned by user 1 (the mocked user)
    dbInstance
      .prepare(
        `INSERT INTO plants (user_id, name, common_name, is_personal, is_favorite, has_fragrance, is_petsafe, can_sell) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(1, 'My Plant', 'My Common', 0, 0, 0, 0, 0);

    const plantRow = dbInstance.prepare('SELECT id FROM plants WHERE user_id = 1').get() as { id: number };

    const event = createMockH3Event({
      body: {},
      params: { id: String(plantRow.id) },
    });

    const response = (await handler.handler(event, dbInstance)) as Plant;
    expect(response).toBeDefined();
    expect(response.name).toBe('My Plant');
  });
});
