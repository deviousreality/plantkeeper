import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import { useDBTestUtils, useH3TestUtils, mockAuth } from '~/test/setup';
import { createMockH3Event } from '~/test/mocks/h3-events';
import { type Database } from 'better-sqlite3';
import FormData from 'form-data';
import type { H3Error } from 'h3';

vi.mock('sharp', () => {
  // Return a function that returns an object with a resize method,
  // which returns an object with a toBuffer method that resolves to the original buffer or a dummy buffer.
  return {
    default: (inputBuffer: Buffer) => ({
      resize: (width: number, height: number) => ({
        toBuffer: async () => inputBuffer, // or Buffer.from('mocked image')
      }),
      toBuffer: async () => inputBuffer, // for direct toBuffer calls
    }),
  };
});

describe('POST /api/plant_photos', async () => {
  let dbInstance: Database;
  const h3 = useH3TestUtils();

  const tinyPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0a, 0x49,
    0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x26, 0x05, 0x9b, 0x00, 0x00,
    0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  beforeEach(async () => {
    vi.clearAllMocks();
    dbInstance = useDBTestUtils();
    await mockAuth(); // Mock authentication for session-based auth
  });

  afterEach(() => {
    dbInstance.close();
  });

  const handler = await import('../index.post');

  it('creates a new plant photo for valid request', async () => {
    const formData = new FormData();
    formData.append('plant_id', '1');
    formData.append('image', tinyPng);

    h3.readMultipartFormData.mockResolvedValue([
      {
        name: 'plant_id',
        data: Buffer.from('1'),
        type: 'text/plain',
      },
      {
        name: 'image',
        filename: 'test_photo.png',
        data: tinyPng,
        type: 'image/png',
      },
    ]);

    const event = createMockH3Event({
      body: formData, // Not used since we're mocking readMultipartFormData
      requestHeaders: {
        'content-type': `multipart/form-data; boundary=${(formData as any)._boundary}`,
        'content-length': formData.getLengthSync().toString(),
      },
    });

    const response = (await handler.handler(event, dbInstance)) as {
      success: boolean;
      message: string;
      plant_id: number;
    };
    expect(response).toBeDefined();
    expect(response.plant_id).toBeGreaterThan(0);
    expect(response.message).toBe('Plant photo uploaded successfully');
    expect(response.success).toBe(true);
  });

  it('should return 500 if plant_id is missing', async () => {
    const formData = new FormData();
    formData.append('image', tinyPng);

    h3.readMultipartFormData.mockResolvedValue([
      {
        name: 'image',
        filename: 'test_photo.png',
        data: tinyPng,
        type: 'image/png',
      },
    ]);

    const event = createMockH3Event({
      body: formData, // Not used since we're mocking readMultipartFormData
      requestHeaders: {
        'content-type': `multipart/form-data; boundary=${(formData as any)._boundary}`,
        'content-length': formData.getLengthSync().toString(),
      },
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

  it('should return 400 for invalid file type', async () => {
    h3.readMultipartFormData.mockResolvedValue([
      {
        name: 'plant_id',
        data: Buffer.from('1'),
        type: 'text/plain',
      },
      {
        name: 'image',
        filename: 'malware.exe',
        data: Buffer.from('fake binary content'),
        type: 'application/x-msdownload',
      },
    ]);

    const event = createMockH3Event({
      body: {},
    });

    try {
      await handler.handler(event, dbInstance);
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error as H3Error).toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Invalid file type'),
      });
    }
  });

  it('should return 400 for file with no MIME type', async () => {
    h3.readMultipartFormData.mockResolvedValue([
      {
        name: 'plant_id',
        data: Buffer.from('1'),
        type: 'text/plain',
      },
      {
        name: 'image',
        filename: 'unknown.bin',
        data: Buffer.from('some data'),
        // no type property
      },
    ]);

    const event = createMockH3Event({
      body: {},
    });

    try {
      await handler.handler(event, dbInstance);
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error as H3Error).toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Invalid file type'),
      });
    }
  });

  it('should return 400 for file exceeding max size', async () => {
    // Create a buffer larger than 10MB
    const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);

    h3.readMultipartFormData.mockResolvedValue([
      {
        name: 'plant_id',
        data: Buffer.from('1'),
        type: 'text/plain',
      },
      {
        name: 'image',
        filename: 'huge_photo.png',
        data: oversizedBuffer,
        type: 'image/png',
      },
    ]);

    const event = createMockH3Event({
      body: {},
    });

    try {
      await handler.handler(event, dbInstance);
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error as H3Error).toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('File too large'),
      });
    }
  });

  it('should accept valid image MIME types', async () => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    for (const mimeType of validTypes) {
      vi.clearAllMocks();
      await mockAuth();

      h3.readMultipartFormData.mockResolvedValue([
        {
          name: 'plant_id',
          data: Buffer.from('1'),
          type: 'text/plain',
        },
        {
          name: 'image',
          filename: `photo.${mimeType.split('/')[1]}`,
          data: tinyPng,
          type: mimeType,
        },
      ]);

      const event = createMockH3Event({
        body: {},
      });

      const response = (await handler.handler(event, dbInstance)) as any;
      expect(response.success).toBe(true);
    }
  });
});
