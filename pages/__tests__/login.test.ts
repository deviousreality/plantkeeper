import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mirror the getRedirectUrl function from login.vue for direct testing
function getRedirectUrl(redirectQuery: string | string[] | undefined | null): string {
  if (typeof redirectQuery !== 'string') {
    return '/plants';
  }

  if (!redirectQuery.startsWith('/') || redirectQuery.startsWith('//') || redirectQuery.includes('://')) {
    return '/plants';
  }

  return redirectQuery;
}

describe('Login redirect URL validation', () => {
  // Source code verification tests
  describe('login.vue source code checks', () => {
    const loginSource = readFileSync(resolve(__dirname, '../login.vue'), 'utf-8');

    it('should contain redirect URL validation logic', () => {
      expect(loginSource).toContain("startsWith('/')");
      expect(loginSource).toContain("startsWith('//')");
      expect(loginSource).toContain("includes('://')");
    });

    it('should not blindly return the redirect query string', () => {
      // The old insecure pattern was:
      //   if (typeof redirectQuery === 'string') { return redirectQuery; }
      // This should no longer be present as a simple pass-through
      expect(loginSource).not.toMatch(
        /if\s*\(\s*typeof\s+redirectQuery\s*===\s*['"]string['"]\s*\)\s*\{\s*return\s+redirectQuery\s*;?\s*\}/
      );
    });
  });

  // Functional validation tests
  describe('getRedirectUrl', () => {
    it('should return /plants for undefined input', () => {
      expect(getRedirectUrl(undefined)).toBe('/plants');
    });

    it('should return /plants for null input', () => {
      expect(getRedirectUrl(null)).toBe('/plants');
    });

    it('should return /plants for array input', () => {
      expect(getRedirectUrl(['/foo', '/bar'])).toBe('/plants');
    });

    it('should accept valid relative paths', () => {
      expect(getRedirectUrl('/plants')).toBe('/plants');
      expect(getRedirectUrl('/plants/1')).toBe('/plants/1');
      expect(getRedirectUrl('/care-tips')).toBe('/care-tips');
    });

    it('should reject absolute URLs (https://)', () => {
      expect(getRedirectUrl('https://evil.com')).toBe('/plants');
    });

    it('should reject absolute URLs (http://)', () => {
      expect(getRedirectUrl('http://evil.com')).toBe('/plants');
    });

    it('should reject protocol-relative URLs (//)', () => {
      expect(getRedirectUrl('//evil.com')).toBe('/plants');
    });

    it('should reject javascript: URLs', () => {
      expect(getRedirectUrl('javascript://alert(1)')).toBe('/plants');
    });

    it('should reject URLs not starting with /', () => {
      expect(getRedirectUrl('evil.com/path')).toBe('/plants');
      expect(getRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe('/plants');
    });

    it('should accept paths with query parameters', () => {
      expect(getRedirectUrl('/plants?page=2')).toBe('/plants?page=2');
    });

    it('should accept paths with hash fragments', () => {
      expect(getRedirectUrl('/plants#section')).toBe('/plants#section');
    });
  });
});
