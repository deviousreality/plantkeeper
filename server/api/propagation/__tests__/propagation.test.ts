import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import { useDBTestUtils, useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import { type Database } from 'better-sqlite3';

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

function insertPlantForUser(db: Database, plantId: number, userId: number, name: string) {
  db.prepare('INSERT INTO plants (id, user_id, name) VALUES (?, ?, ?)').run(plantId, userId, name);
}

function insertOtherUser(db: Database) {
  db.prepare('INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)').run(
    2,
    'otheruser',
    'password',
    'other@example.com'
  );
}

function insertPropagation(
  db: Database,
  id: number,
  plantId: number,
  propType: number,
  propDate: string,
  extras: Record<string, any> = {}
) {
  db.prepare(
    'INSERT INTO plant_propagation (id, plant_id, prop_type, prop_date, seed_source, cutting_source, initial_count, current_count, transplant_date, notes, zero_count_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    plantId,
    propType,
    propDate,
    extras.seedSource || null,
    extras.cuttingSource || null,
    extras.initialCount || null,
    extras.currentCount || null,
    extras.transplantDate || null,
    extras.notes || null,
    extras.zeroCountNotes || null
  );
}

describe('GET /api/propagation/[id]', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  beforeEach(() => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils();
  });

  afterEach(() => {
    dbInstance.close();
  });

  const getHandler = await import('../[id].get');

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = await import('~/server/utils/session');
    vi.mocked(requireAuth).mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    );

    const event = createMockH3Event({ params: { id: '1' } });

    await expect(getHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('returns 404 for non-existent propagation record', async () => {
    const event = createMockH3Event({ params: { id: '999' } });

    await expect(getHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Propagation record not found',
    });
  });

  it('returns 404 when user does not own the plant', async () => {
    insertOtherUser(dbInstance);
    insertPlantForUser(dbInstance, 2, 2, 'Other Plant');
    insertPropagation(dbInstance, 99, 2, 1, '2025-01-01');

    const event = createMockH3Event({ params: { id: '99' } });

    await expect(getHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Propagation record not found',
    });
  });

  it('returns propagation record for valid owned plant', async () => {
    insertPlantForUser(dbInstance, 1, 1, 'Test Plant');
    insertPropagation(dbInstance, 1, 1, 2, '2025-03-15', {
      seedSource: 'Garden Center',
      initialCount: 5,
      currentCount: 3,
      notes: 'Growing well',
    });

    const event = createMockH3Event({ params: { id: '1' } });

    const result = (await getHandler.handler(event, dbInstance)) as any;

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.id).toBe(1);
    expect(result.data.plantId).toBe(1);
    expect(result.data.plantName).toBe('Test Plant');
    expect(result.data.propType).toBe(2);
    expect(result.data.propDate).toBe('2025-03-15');
    expect(result.data.seedSource).toBe('Garden Center');
    expect(result.data.initialCount).toBe(5);
    expect(result.data.currentCount).toBe(3);
    expect(result.data.notes).toBe('Growing well');
  });
});

describe('PUT /api/propagation/[id]', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  beforeEach(() => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils();
  });

  afterEach(() => {
    dbInstance.close();
  });

  const putHandler = await import('../[id].put');

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = await import('~/server/utils/session');
    vi.mocked(requireAuth).mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    );

    const event = createMockH3Event({
      params: { id: '1' },
      body: { plantId: 1, propType: 1, propDate: '2025-01-01' },
    });

    await expect(putHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('returns 400 for missing plantId', async () => {
    const event = createMockH3Event({
      params: { id: '1' },
      body: { propType: 1, propDate: '2025-01-01' },
    });

    await expect(putHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Plant ID is required',
    });
  });

  it('returns 400 for missing propType', async () => {
    const event = createMockH3Event({
      params: { id: '1' },
      body: { plantId: 1, propDate: '2025-01-01' },
    });

    await expect(putHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Propagation type is required',
    });
  });

  it('returns 400 for missing propDate', async () => {
    const event = createMockH3Event({
      params: { id: '1' },
      body: { plantId: 1, propType: 1 },
    });

    await expect(putHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Propagation date is required',
    });
  });

  it('returns 404 for record not owned by user', async () => {
    insertOtherUser(dbInstance);
    insertPlantForUser(dbInstance, 2, 2, 'Other Plant');
    insertPropagation(dbInstance, 99, 2, 1, '2025-01-01');

    const event = createMockH3Event({
      params: { id: '99' },
      body: { plantId: 2, propType: 1, propDate: '2025-06-01' },
    });

    await expect(putHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Propagation record not found or you do not have permission to update it',
    });
  });

  it('successfully updates propagation record', async () => {
    insertPlantForUser(dbInstance, 1, 1, 'Test Plant');
    insertPropagation(dbInstance, 1, 1, 1, '2025-01-01');

    const event = createMockH3Event({
      params: { id: '1' },
      body: {
        plantId: 1,
        propType: 2,
        propDate: '2025-06-15',
        seedSource: 'Online Store',
        initialCount: 10,
        currentCount: 8,
        notes: 'Updated notes',
      },
    });

    const result = (await putHandler.handler(event, dbInstance)) as any;

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.propType).toBe(2);
    expect(result.data.propDate).toBe('2025-06-15');
    expect(result.data.seedSource).toBe('Online Store');
    expect(result.data.initialCount).toBe(10);
    expect(result.data.currentCount).toBe(8);
    expect(result.data.notes).toBe('Updated notes');
  });
});

describe('DELETE /api/propagation/[id]', async () => {
  let dbInstance: Database;
  useH3TestUtils();

  beforeEach(() => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils();
  });

  afterEach(() => {
    dbInstance.close();
  });

  const deleteHandler = await import('../[id].delete');

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = await import('~/server/utils/session');
    vi.mocked(requireAuth).mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    );

    const event = createMockH3Event({ params: { id: '1' } });

    await expect(deleteHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('returns 404 for record not owned by user', async () => {
    insertOtherUser(dbInstance);
    insertPlantForUser(dbInstance, 2, 2, 'Other Plant');
    insertPropagation(dbInstance, 99, 2, 1, '2025-01-01');

    const event = createMockH3Event({ params: { id: '99' } });

    await expect(deleteHandler.handler(event, dbInstance)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Propagation record not found or you do not have permission to delete it',
    });
  });

  it('successfully deletes propagation record', async () => {
    insertPlantForUser(dbInstance, 1, 1, 'Test Plant');
    insertPropagation(dbInstance, 1, 1, 1, '2025-01-01');

    const event = createMockH3Event({ params: { id: '1' } });

    const result = (await deleteHandler.handler(event, dbInstance)) as any;

    expect(result.success).toBe(true);
    expect(result.message).toBe('Propagation record deleted successfully');

    // Verify record was deleted
    const record = dbInstance
      .prepare('SELECT id FROM plant_propagation WHERE id = ?')
      .get(1);
    expect(record).toBeUndefined();
  });
});
