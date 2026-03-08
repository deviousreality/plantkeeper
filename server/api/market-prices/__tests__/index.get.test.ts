import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import { useDBTestUtils, useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import type { H3Event } from 'h3';
import { Database } from 'better-sqlite3';

vi.mock('~/server/utils/session', () => ({
  requireAuth: vi
    .fn()
    .mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401, statusMessage: 'Unauthorized - Please log in' })
    ),
}));

describe('GET /api/market-prices', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  beforeEach(async () => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils();
    const { requireAuth } = vi.mocked(await import('~/server/utils/session'));
    requireAuth.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401, statusMessage: 'Unauthorized - Please log in' })
    );
  });

  afterEach(() => {
    dbInstance.close();
  });

  const handler = await import('../index.get');

  it('should return 401 if user is not authenticated', async () => {
    const event = createMockH3Event({
      method: 'GET',
      query: {},
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('should ignore userId query parameter and use session user', async () => {
    // Override requireAuth to return authenticated user with id=1
    const { requireAuth } = vi.mocked(await import('~/server/utils/session'));
    requireAuth.mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
    });

    // Insert a second user
    dbInstance
      .prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)')
      .run('otheruser', 'password', 'other@example.com');

    // Insert plants for user 1 and user 2
    const insertPlant = dbInstance.prepare(
      `INSERT INTO plants (user_id, name, species_id, family_id, genus_id, common_name, variety, flower_color, is_personal, is_favorite, acquired_date, notes, light_pref, water_pref, soil_type, plant_zones, plant_use, has_fragrance, fragrance_description, is_petsafe, can_sell) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertPlant.run(
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
    insertPlant.run(
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

    // Client tries to pass userId=2, but session user is id=1
    const event = createMockH3Event({
      method: 'GET',
      query: { userId: '2' },
    }) as H3Event;

    const response = await handler.default(event);

    // Should only return user 1's plants (from session), not user 2's
    expect(response).toHaveLength(1);
    expect(response[0].name).toBe('User1 Plant');
  });
});
