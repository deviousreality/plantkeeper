import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import { useDBTestUtils, useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import { Database } from 'better-sqlite3';
import { Plant } from '~/types';

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
    });

    const response = (await handler.handler(event, dbInstance)) as Plant[];

    expect(response.length).toBeGreaterThan(0);
  });

  it('should only return plants owned by the authenticated user', async () => {
    // Insert a second user
    dbInstance
      .prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)')
      .run('otheruser', 'password', 'other@example.com');

    const insertStmt = dbInstance.prepare(
      `INSERT INTO plants (user_id, name, species_id, family_id, genus_id, common_name, variety, flower_color, is_personal, is_favorite, acquired_date, notes, light_pref, water_pref, soil_type, plant_zones, plant_use, has_fragrance, fragrance_description, is_petsafe, can_sell) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    // Plant for user 1 (authenticated user)
    insertStmt.run(
      1,
      'My Plant',
      null,
      null,
      null,
      'My Common',
      'V1',
      'Red',
      1,
      0,
      '2023-01-01',
      '',
      'Sun',
      'Medium',
      'Loam',
      '5-9',
      'Ornamental',
      0,
      '',
      1,
      0
    );
    // Plant for user 2 (other user)
    insertStmt.run(
      2,
      'Other Plant',
      null,
      null,
      null,
      'Other Common',
      'V2',
      'Yellow',
      1,
      0,
      '2023-02-01',
      '',
      'Shade',
      'Low',
      'Clay',
      '3-7',
      'Edible',
      0,
      '',
      0,
      1
    );

    const event = createMockH3Event({ body: {} });
    const response = (await handler.handler(event, dbInstance)) as Plant[];

    expect(response.length).toBe(1);
    expect(response[0].name).toBe('My Plant');
  });

  it('should ignore userId query parameter and use session user', async () => {
    // Insert a second user
    dbInstance
      .prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)')
      .run('otheruser', 'password', 'other@example.com');

    const insertStmt = dbInstance.prepare(
      `INSERT INTO plants (user_id, name, species_id, family_id, genus_id, common_name, variety, flower_color, is_personal, is_favorite, acquired_date, notes, light_pref, water_pref, soil_type, plant_zones, plant_use, has_fragrance, fragrance_description, is_petsafe, can_sell) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    // Plant for user 1 (authenticated user)
    insertStmt.run(
      1,
      'User1 Plant',
      null,
      null,
      null,
      'U1 Common',
      'V1',
      'Red',
      1,
      0,
      '2023-01-01',
      '',
      'Sun',
      'Medium',
      'Loam',
      '5-9',
      'Ornamental',
      0,
      '',
      1,
      0
    );
    // Plant for user 2
    insertStmt.run(
      2,
      'User2 Plant',
      null,
      null,
      null,
      'U2 Common',
      'V2',
      'Yellow',
      1,
      0,
      '2023-02-01',
      '',
      'Shade',
      'Low',
      'Clay',
      '3-7',
      'Edible',
      0,
      '',
      0,
      1
    );

    // Client tries to pass userId=2 in query, but session user is id=1
    const event = createMockH3Event({
      body: {},
      query: { userId: '2' },
    });
    const response = (await handler.handler(event, dbInstance)) as Plant[];

    // Should only return user 1's plants (from session), not user 2's
    expect(response.length).toBe(1);
    expect(response[0].name).toBe('User1 Plant');
  });
});
