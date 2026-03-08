import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively find all .ts files under a directory, excluding __tests__ directories.
 */
function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      results.push(...findTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

const serverApiDir = path.resolve(__dirname, '..', 'server', 'api');
const apiFiles = findTsFiles(serverApiDir);

describe('Console statement security', () => {
  it('should find server/api files to scan', () => {
    expect(apiFiles.length).toBeGreaterThan(0);
  });

  describe('No active console.log statements in server/api/**/*.ts', () => {
    for (const filePath of apiFiles) {
      const relativePath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');

      it(`${relativePath} should not contain active console.log`, () => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const violations: string[] = [];

        lines.forEach((line, index) => {
          const trimmed = line.trim();
          // Skip commented-out lines
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            return;
          }
          if (trimmed.includes('console.log(') || trimmed.includes('console.log`')) {
            violations.push(`Line ${index + 1}: ${trimmed}`);
          }
        });

        expect(violations, `Found active console.log in ${relativePath}:\n${violations.join('\n')}`).toHaveLength(0);
      });
    }
  });

  describe('console.error statements should not log raw error objects', () => {
    for (const filePath of apiFiles) {
      const relativePath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');

      it(`${relativePath} should sanitize error objects in console.error`, () => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const violations: string[] = [];

        lines.forEach((line, index) => {
          const trimmed = line.trim();
          // Skip commented-out lines
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            return;
          }
          // Check for console.error calls
          if (trimmed.includes('console.error(')) {
            // Match patterns like: console.error('...', error) or console.error("...", error)
            // where error is a bare variable (not error.message, not error instanceof, not a string literal)
            // The safe patterns are:
            //   console.error('msg', error instanceof Error ? error.message : String(error))
            //   console.error('msg') — just a string, no error variable
            const consoleErrorMatch = trimmed.match(/console\.error\((.+)\)/s);
            if (consoleErrorMatch) {
              const args = consoleErrorMatch[1];
              // Check if it ends with a bare `, error)` — i.e. passing raw error object
              // A raw error reference would be: , error) at end or , err) at end
              // Safe patterns include: error.message, error instanceof, String(error)
              if (/,\s*error\s*$/.test(args) || /,\s*err\s*$/.test(args)) {
                violations.push(`Line ${index + 1}: ${trimmed}`);
              }
            }
          }
        });

        expect(
          violations,
          `Found console.error logging raw error objects in ${relativePath}:\n${violations.join('\n')}`
        ).toHaveLength(0);
      });
    }
  });
});
