import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import { useDBTestUtils, useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import { Database } from 'better-sqlite3';
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

describe('POST /api/care-schedules/:id', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  const ensureUser = (dbInstance: Database, userId: number): void => {
    const existing = dbInstance.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!existing) {
      dbInstance
        .prepare('INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)')
        .run(userId, `user${userId}`, 'password', `user${userId}@example.com`);
    }
  };

  const insertPlant = (dbInstance: Database, userId: number = 1): number => {
    ensureUser(dbInstance, userId);
    dbInstance
      .prepare(
        `INSERT INTO plants (user_id, name, common_name, is_personal, is_favorite, has_fragrance, is_petsafe, can_sell)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(userId, 'Test Plant', 'Test Common', 0, 0, 0, 0, 0);
    const row = dbInstance.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
    return row.id;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils();
  });

  afterEach(() => {
    dbInstance.close();
  });

  const handler = await import('../[id].post');

  it('should return 401 if user is not authenticated', async () => {
    const { requireAuth } = await import('~/server/utils/session');
    vi.mocked(requireAuth).mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    );

    const event = createMockH3Event({
      body: {},
      params: { id: '1' },
    });

    try {
      await handler.handler(event, dbInstance);
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error as H3Error).toMatchObject({
        statusCode: 401,
      });
    }
  });

  it('should return 404 if plant does not exist', async () => {
    const event = createMockH3Event({
      body: {
        wateringInterval: 7,
        lastWatered: '2025-01-01',
      },
      params: { id: '9999' },
    });

    try {
      await handler.handler(event, dbInstance);
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error as H3Error).toMatchObject({
        statusCode: 404,
        message: 'Plant not found',
      });
    }
  });

  it('should return 403 if user does not own the plant', async () => {
    // Insert a plant owned by user 2
    const plantId = insertPlant(dbInstance, 2);

    const event = createMockH3Event({
      body: {
        wateringInterval: 7,
        lastWatered: '2025-01-01',
      },
      params: { id: plantId.toString() },
    });

    try {
      await handler.handler(event, dbInstance);
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error as H3Error).toMatchObject({
        statusCode: 403,
        message: "Not authorized to modify this plant's schedule",
      });
    }
  });

  it('creates a new care schedule for a valid request', async () => {
    const plantId = insertPlant(dbInstance, 1);

    const event = createMockH3Event({
      body: {
        wateringInterval: 7,
        fertilizingInterval: 30,
        lastWatered: '2025-02-01',
        lastFertilized: '2025-01-15',
        lightNeeds: 'Full Sun',
      },
      params: { id: plantId.toString() },
    });

    const response = (await handler.handler(event, dbInstance)) as {
      success: boolean;
      id: number;
      data: Record<string, unknown>;
      message: string;
    };

    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.message).toBe('Care schedule created');
    expect(response.data).toBeDefined();
    expect(response.data.plant_id).toBe(plantId);
    expect(response.data.watering_interval).toBe(7);
    expect(response.data.fertilizing_interval).toBe(30);
    expect(response.data.light_needs).toBe('Full Sun');
  });

  it('updates an existing care schedule', async () => {
    const plantId = insertPlant(dbInstance, 1);

    // Create initial schedule
    const createEvent = createMockH3Event({
      body: {
        wateringInterval: 7,
        fertilizingInterval: 30,
        lastWatered: '2025-02-01',
        lastFertilized: '2025-01-15',
        lightNeeds: 'Full Sun',
      },
      params: { id: plantId.toString() },
    });

    await handler.handler(createEvent, dbInstance);

    // Update the schedule
    const updateEvent = createMockH3Event({
      body: {
        wateringInterval: 14,
        fertilizingInterval: 60,
        lastWatered: '2025-02-10',
        lastFertilized: '2025-02-01',
        lightNeeds: 'Partial Shade',
      },
      params: { id: plantId.toString() },
    });

    const response = (await handler.handler(updateEvent, dbInstance)) as {
      success: boolean;
      id: number;
      data: Record<string, unknown>;
      message: string;
    };

    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.message).toBe('Care schedule updated');
    expect(response.data.watering_interval).toBe(14);
    expect(response.data.fertilizing_interval).toBe(60);
    expect(response.data.light_needs).toBe('Partial Shade');
  });
});
