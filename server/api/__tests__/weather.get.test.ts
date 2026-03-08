import { describe, expect, vi, it, beforeEach } from 'vitest';
import { useH3TestUtils } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import type { H3Event } from 'h3';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Hoist all mocks
const mockAxiosGet = vi.hoisted(() => vi.fn());
const mockRequireAuth = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: {
    get: mockAxiosGet,
  },
}));

vi.mock('~/server/utils/session', () => ({
  requireAuth: mockRequireAuth,
}));

// Provide useRuntimeConfig as a global (server-only key, not in public)
vi.stubGlobal('useRuntimeConfig', () => ({
  weatherApiKey: 'test-api-key',
  public: {},
}));

describe('GET /api/weather', async () => {
  useH3TestUtils();

  beforeEach(() => {
    mockAxiosGet.mockClear();
    mockRequireAuth.mockReset();
    mockRequireAuth.mockResolvedValue({ id: 1, username: 'testuser', email: 'test@example.com' });
  });

  // Import after mocks are set up
  const handler = await import('../weather.get');

  it('should not expose weatherApiKey in public runtime config', () => {
    // Read the actual nuxt.config.ts to verify weatherApiKey placement
    const configContent = readFileSync(resolve(__dirname, '../../../nuxt.config.ts'), 'utf-8');

    // weatherApiKey should NOT be inside runtimeConfig.public
    // It should be at the top level of runtimeConfig (server-only)
    const publicBlockMatch = configContent.match(/public:\s*\{([^}]*)\}/);
    expect(publicBlockMatch).toBeTruthy();
    expect(publicBlockMatch![1]).not.toContain('weatherApiKey');

    // weatherApiKey should be in runtimeConfig (server-only)
    expect(configContent).toContain('weatherApiKey:');
  });

  it('should use server-only config.weatherApiKey, not config.public', () => {
    // Read the weather handler source to verify it accesses config.weatherApiKey (not config.public)
    const handlerContent = readFileSync(resolve(__dirname, '../weather.get.ts'), 'utf-8');
    expect(handlerContent).toContain('config.weatherApiKey');
    expect(handlerContent).not.toContain('config.public.weatherApiKey');
  });

  it('should return 400 when no location parameters are provided', async () => {
    const event = createMockH3Event({
      method: 'GET',
      query: {},
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('should return 400 when only lat is provided without lon', async () => {
    const event = createMockH3Event({
      method: 'GET',
      query: { lat: '40.7128' },
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('should call OpenWeatherMap API with city parameter', async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        main: { temp: 20, humidity: 65 },
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
        sys: { sunrise: 1700000000, sunset: 1700040000 },
      },
    });

    const event = createMockH3Event({
      method: 'GET',
      query: { city: 'London' },
    }) as H3Event;

    const result = await handler.default(event);

    expect(mockAxiosGet).toHaveBeenCalledWith(expect.stringContaining('q=London'));
    expect(result).toEqual({
      temperature: 20,
      humidity: 65,
      conditions: 'Clear',
      description: 'clear sky',
      icon: '01d',
      sunrise: 1700000000,
      sunset: 1700040000,
    });
  });

  it('should call OpenWeatherMap API with lat/lon parameters', async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        main: { temp: 15, humidity: 70 },
        weather: [{ main: 'Clouds', description: 'overcast clouds', icon: '04d' }],
        sys: { sunrise: 1700000000, sunset: 1700040000 },
      },
    });

    const event = createMockH3Event({
      method: 'GET',
      query: { lat: '40.7128', lon: '-74.0060' },
    }) as H3Event;

    const result = await handler.default(event);

    expect(mockAxiosGet).toHaveBeenCalledWith(expect.stringContaining('lat=40.7128&lon=-74.0060'));
    expect(result).toHaveProperty('temperature', 15);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), { statusCode: 401, statusMessage: 'Unauthorized - Please log in' })
    );

    const event = createMockH3Event({
      method: 'GET',
      query: { city: 'London' },
    }) as H3Event;

    await expect(handler.default(event)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
