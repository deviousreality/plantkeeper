import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import 'dotenv/config';

// Replace with your actual admin user seed data
const adminUser = {
  username: process.env['ADMIN_USERNAME'],
  password: process.env['ADMIN_PASSWORD'],
  email: process.env['ADMIN_EMAIL'],
};

export function up(db: Database.Database) {
  const userCount = db.prepare<unknown[], { count: number }>('SELECT COUNT(*) as count FROM users').get()?.count;
  if (userCount === 0) {
    // Validate that we have a password
    if (!adminUser.password) {
      throw new Error('ADMIN_PASSWORD environment variable is required');
    }

    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(adminUser.password, saltRounds);

    db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)').run(
      adminUser.username,
      passwordHash,
      adminUser.email
    );
    console.log('Seeded admin user.');
  } else {
    console.log('Users already exist, skipping admin seed.');
  }
}

export function down(db: Database.Database) {
  // Optionally remove the seeded admin user
  db.prepare('DELETE FROM users WHERE username = ?').run(adminUser.username);
  console.log('Removed seeded admin user.');
}
