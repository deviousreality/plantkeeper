import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('nuxt.config.ts CORS configuration', () => {
  const configContent = readFileSync(resolve(__dirname, '../nuxt.config.ts'), 'utf-8');

  it('should not have unrestricted cors: true for API routes', () => {
    // Ensure '/api/**': { cors: true } is NOT present (unrestricted CORS)
    // The old insecure pattern was just `cors: true` with no origin restriction
    expect(configContent).not.toMatch(/['"]\/api\/\*\*['"]\s*:\s*\{\s*cors\s*:\s*true\s*\}/);
  });

  it('should restrict CORS origins using environment variable in production', () => {
    // Verify CORS_ORIGIN env var is referenced for production config
    expect(configContent).toContain('CORS_ORIGIN');
  });

  it('should set Access-Control-Allow-Origin header in production', () => {
    expect(configContent).toContain('Access-Control-Allow-Origin');
  });

  it('should set Access-Control-Allow-Methods header in production', () => {
    expect(configContent).toContain('Access-Control-Allow-Methods');
  });

  it('should only enable open CORS in development mode', () => {
    // Verify cors is conditional on isDevMode
    expect(configContent).toContain('cors: isDevMode');
  });
});
