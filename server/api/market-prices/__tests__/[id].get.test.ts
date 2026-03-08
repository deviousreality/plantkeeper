import { describe, expect, vi, it, beforeEach } from 'vitest';
import { useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import type { H3Event } from 'h3';

vi.mock('~/server/utils/session', () => ({
  requireAuth: vi
    .fn()
    .mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401, statusMessage: 'Unauthorized - Please log in' })
    ),
}));

describe('GET /api/market-prices/[id]', async () => {
  useH3TestUtils();

  beforeEach(async () => {
    vi.clearAllMocks();
    const { requireAuth } = vi.mocked(await import('~/server/utils/session'));
    requireAuth.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401, statusMessage: 'Unauthorized - Please log in' })
    );
  });

  const handler = await import('../[id].get');

  it('should return 401 if user is not authenticated', async () => {
    const event = createMockH3Event({
      method: 'GET',
      params: { id: '1' },
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
