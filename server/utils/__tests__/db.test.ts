import { describe, expect, vi, it, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mock h3's createError
vi.stubGlobal('createError', (options: any) => {
  const error = new Error(options.message || options.statusMessage || 'Error');
  Object.assign(error, options);
  return error;
});

describe('db.ts error sanitization', () => {
  const dbSource = readFileSync(resolve(__dirname, '../db.ts'), 'utf-8');

  describe('handleDataTableTransactionError', () => {
    it('should not include error.message in the thrown error message', () => {
      // The thrown message should NOT contain the pattern: ${error.message} or ${error instanceof Error ? error.message : String(error)}
      // Look for the throw createError block in handleDataTableTransactionError
      const transactionErrorMatch = dbSource.match(
        /handleDataTableTransactionError[\s\S]*?throw\s+createError\(\{[\s\S]*?message:\s*([^\n]+)/
      );
      expect(transactionErrorMatch).toBeTruthy();
      const messageLine = transactionErrorMatch![1];
      // Should NOT contain error.message or String(error) interpolation
      expect(messageLine).not.toContain('error.message');
      expect(messageLine).not.toContain('String(error)');
    });

    it('should log error details server-side', () => {
      // Verify console.error is called with error details (not commented out)
      const functionBody = dbSource.match(
        /handleDataTableTransactionError[\s\S]*?(?=export const handleDatatableFetchError)/
      );
      expect(functionBody).toBeTruthy();
      // Should have an active console.error (not commented out) that logs error details
      expect(functionBody![0]).toMatch(/^\s*console\.error\(/m);
    });
  });

  describe('handleDatatableFetchError', () => {
    it('should not include error.message in the thrown error message', () => {
      const fetchErrorMatch = dbSource.match(
        /handleDatatableFetchError[\s\S]*?throw\s+createError\(\{[\s\S]*?message:\s*([^\n]+)/
      );
      expect(fetchErrorMatch).toBeTruthy();
      const messageLine = fetchErrorMatch![1];
      expect(messageLine).not.toContain('error.message');
      expect(messageLine).not.toContain('String(error)');
    });

    it('should log error details server-side', () => {
      const functionBody = dbSource.match(/handleDatatableFetchError[\s\S]*?(?=export const validateFieldId)/);
      expect(functionBody).toBeTruthy();
      expect(functionBody![0]).toMatch(/^\s*console\.error\(/m);
    });
  });

  describe('safelyPrepare', () => {
    it('should not log raw SQL statements', () => {
      const prepareBody = dbSource.match(/safelyPrepare[\s\S]*?(?=export const createTransaction)/);
      expect(prepareBody).toBeTruthy();
      // Should NOT contain console.error with SQL
      expect(prepareBody![0]).not.toContain('Failed SQL');
    });

    it('should throw a generic error message', () => {
      const prepareBody = dbSource.match(/safelyPrepare[\s\S]*?(?=export const createTransaction)/);
      expect(prepareBody).toBeTruthy();
      expect(prepareBody![0]).toContain("throw new Error('Failed to prepare SQL statement')");
    });
  });
});
