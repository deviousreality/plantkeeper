import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { buildTables } from '~/server/utils/db_build';

function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  buildTables(db);
  return db;
}

describe('001_seed_admin migration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws an error when ADMIN_PASSWORD env var is not set', async () => {
    delete process.env['ADMIN_PASSWORD'];
    delete process.env['ADMIN_USERNAME'];
    delete process.env['ADMIN_EMAIL'];

    const { up } = await import('../001_seed_admin');
    const db = createTestDb();

    expect(() => up(db)).toThrowError('ADMIN_PASSWORD environment variable is required');
    db.close();
  });

  it('successfully seeds an admin user when ADMIN_PASSWORD is set', async () => {
    process.env['ADMIN_USERNAME'] = 'testadmin';
    process.env['ADMIN_PASSWORD'] = 'SecureP@ss99!';
    process.env['ADMIN_EMAIL'] = 'admin@test.com';

    const { up } = await import('../001_seed_admin');
    const db = createTestDb();

    up(db);

    const user = db
      .prepare<
        unknown[],
        { username: string; password: string; email: string }
      >('SELECT username, password, email FROM users WHERE username = ?')
      .get('testadmin');

    expect(user).toBeDefined();
    expect(user!.username).toBe('testadmin');
    expect(user!.email).toBe('admin@test.com');
    db.close();
  });

  it('skips seeding when users already exist', async () => {
    process.env['ADMIN_USERNAME'] = 'testadmin';
    process.env['ADMIN_PASSWORD'] = 'SecureP@ss99!';
    process.env['ADMIN_EMAIL'] = 'admin@test.com';

    const { up } = await import('../001_seed_admin');
    const db = createTestDb();

    // Insert an existing user first
    db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)').run(
      'existinguser',
      'hashedpassword',
      'existing@test.com'
    );

    const consoleSpy = vi.spyOn(console, 'log');
    up(db);

    // Should not have inserted the admin user
    const adminUser = db
      .prepare<unknown[], { username: string }>('SELECT username FROM users WHERE username = ?')
      .get('testadmin');
    expect(adminUser).toBeUndefined();

    // Should log the skip message
    expect(consoleSpy).toHaveBeenCalledWith('Users already exist, skipping admin seed.');
    consoleSpy.mockRestore();
    db.close();
  });

  it('down() removes the seeded admin user', async () => {
    process.env['ADMIN_USERNAME'] = 'testadmin';
    process.env['ADMIN_PASSWORD'] = 'SecureP@ss99!';
    process.env['ADMIN_EMAIL'] = 'admin@test.com';

    const { up, down } = await import('../001_seed_admin');
    const db = createTestDb();

    up(db);

    // Verify user exists
    const userBefore = db
      .prepare<unknown[], { id: number }>('SELECT id FROM users WHERE username = ?')
      .get('testadmin');
    expect(userBefore).toBeDefined();

    down(db);

    // Verify user is removed
    const userAfter = db.prepare<unknown[], { id: number }>('SELECT id FROM users WHERE username = ?').get('testadmin');
    expect(userAfter).toBeUndefined();
    db.close();
  });

  it('stores the password as a bcrypt hash, not plaintext', async () => {
    const plainPassword = 'SecureP@ss99!';
    process.env['ADMIN_USERNAME'] = 'testadmin';
    process.env['ADMIN_PASSWORD'] = plainPassword;
    process.env['ADMIN_EMAIL'] = 'admin@test.com';

    const { up } = await import('../001_seed_admin');
    const db = createTestDb();

    up(db);

    const user = db
      .prepare<unknown[], { password: string }>('SELECT password FROM users WHERE username = ?')
      .get('testadmin');

    expect(user).toBeDefined();
    // Password should not be stored as plaintext
    expect(user!.password).not.toBe(plainPassword);
    // Password should be a valid bcrypt hash
    expect(user!.password).toMatch(/^\$2[aby]?\$\d{2}\$/);
    // Bcrypt compare should succeed
    expect(bcrypt.compareSync(plainPassword, user!.password)).toBe(true);
    db.close();
  });
});
