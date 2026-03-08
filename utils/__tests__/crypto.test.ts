import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generateGuid } from '~/utils/crypto';

describe('generateGuid', () => {
  it('should return a valid UUID v4 format', () => {
    const guid = generateGuid();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(guid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should generate unique values', () => {
    const guids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      guids.add(generateGuid());
    }
    expect(guids.size).toBe(100);
  });

  it('should not use Math.random()', () => {
    const source = readFileSync(resolve(__dirname, '../crypto.ts'), 'utf-8');
    expect(source).not.toContain('Math.random');
  });

  it('should use crypto module for secure random generation', () => {
    const source = readFileSync(resolve(__dirname, '../crypto.ts'), 'utf-8');
    expect(source).toContain("from 'crypto'");
  });
});
