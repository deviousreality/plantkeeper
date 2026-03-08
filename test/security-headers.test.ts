import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('nuxt.config.ts security headers', () => {
  const configContent = readFileSync(resolve(__dirname, '../nuxt.config.ts'), 'utf-8');

  it('should set X-Frame-Options header to DENY', () => {
    expect(configContent).toContain("'X-Frame-Options': 'DENY'");
  });

  it('should set X-Content-Type-Options header to nosniff', () => {
    expect(configContent).toContain("'X-Content-Type-Options': 'nosniff'");
  });

  it('should set X-XSS-Protection header', () => {
    expect(configContent).toContain("'X-XSS-Protection'");
  });

  it('should set Referrer-Policy header', () => {
    expect(configContent).toContain("'Referrer-Policy': 'strict-origin-when-cross-origin'");
  });

  it('should set Permissions-Policy header', () => {
    expect(configContent).toContain("'Permissions-Policy'");
    expect(configContent).toContain('camera=()');
    expect(configContent).toContain('microphone=()');
    expect(configContent).toContain('geolocation=()');
  });

  it('should set Content-Security-Policy header', () => {
    expect(configContent).toContain("'Content-Security-Policy'");
    expect(configContent).toContain("default-src 'self'");
    expect(configContent).toContain("frame-ancestors 'none'");
  });

  it('should apply security headers globally with /** route rule', () => {
    // Verify there's a '/**' rule
    expect(configContent).toMatch(/['"]\/\*\*['"]\s*:/);
  });
});
