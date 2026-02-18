import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

/**
 * This builds the database schema by creating necessary tables.
 */

const DATA_DIR = process.env['DATABASE_DIR'] 
  ? path.resolve(process.env['DATABASE_DIR']) 
  : path.join(process.cwd(), './.data');
const DB_FILENAME = process.env['DATABASE_NAME'] || 'plant-keeper.db';

// Function to build database tables
const buildTables = (db: Database.Database): void => {
  // Migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sessions table for authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create index on expires_at for efficient cleanup queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)
  `);

  // Plants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      species_id INTEGER,
      family_id INTEGER,
      genus_id INTEGER,
      acquired_date DATE,
      image_url TEXT,
      notes TEXT,
      is_favorite BOOLEAN DEFAULT 0,
      can_sell BOOLEAN DEFAULT 0,
      is_personal BOOLEAN DEFAULT 0,
      common_name TEXT,
      flower_color TEXT,
      variety TEXT,
      light_pref TEXT,
      water_pref TEXT,
      soil_type TEXT,
      plant_use VARCHAR(50),
      has_fragrance BOOLEAN DEFAULT 0,
      fragrance_description TEXT,
      is_petsafe BOOLEAN DEFAULT 0,
      plant_zones INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at DATE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (species_id) REFERENCES plant_species(id),
      FOREIGN KEY (family_id) REFERENCES plant_family(id),
      FOREIGN KEY (genus_id) REFERENCES plant_genus(id)
    )
  `);

  // Plant Species table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plant_species (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      genus_id INTEGER NOT NULL,
      common_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (genus_id) REFERENCES plant_genus(id)
    )
  `);

  // Plant Genus table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plant_genus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      family_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES plant_family(id)
    )
  `);

  // Plant Family table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plant_family (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Market Price table
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_price (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      date_checked DATE NOT NULL,
      price DECIMAL(5,2) NOT NULL,
      FOREIGN KEY (plant_id) REFERENCES plants(id)
    )
  `);

  // Plant Propagation table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plant_propagation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      prop_type INTEGER,
      seed_source TEXT,
      cutting_source TEXT,
      prop_date DATE,
      initial_count INTEGER,
      current_count INTEGER,
      transplant_date DATE,
      notes TEXT,
      zero_count_notes TEXT,
      FOREIGN KEY (plant_id) REFERENCES plants(id)
    )
  `);

  // Plant Inventory table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plant_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      quantity INTEGER,
      plant_age INTEGER,
      plant_size DECIMAL(5,2),
      last_watered_date DATE,
      last_fertilized_date DATE,
      location TEXT,
      notes TEXT,
      acquisition_date DATE,
      status TEXT,
      date_death DATE,
      cause_of_death TEXT,
      death_notes TEXT,
      death_location TEXT,
      FOREIGN KEY (plant_id) REFERENCES plants(id)
    )
  `);

  // Care schedule table
  db.exec(`
    CREATE TABLE IF NOT EXISTS care_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      watering_interval INTEGER,
      fertilizing_interval INTEGER,
      last_watered DATE,
      last_fertilized DATE,
      light_needs TEXT,
      next_task_date DATE,
      FOREIGN KEY (plant_id) REFERENCES plants(id)
    )
  `);

  // Care logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS care_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (plant_id) REFERENCES plants(id)
    )
  `);

  // Care tips table
  db.exec(`
    CREATE TABLE IF NOT EXISTS care_tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      species TEXT NOT NULL,
      tip TEXT NOT NULL,
      source TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Personal Plants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS personal_plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      count INTEGER,
      zero_reason TEXT,
      container_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plant_id) REFERENCES plants(id)
    )
  `);

  // Plant Photos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plant_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      image BLOB,
      mime_type VARCHAR(100) NOT NULL,
      size_type INTEGER, 
      guid VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Determine DB path based on environment
const getDbPath = (): string => {
  const env = process.env['NODE_ENV'] || 'development';

  if (env === 'test' || process.env['VITEST']) {
    return ':memory:';
  }
  return path.join(DATA_DIR, DB_FILENAME);
};

// Create or connect to the database
const createDatabase = (dbPath: string): Database.Database => {
  // if TEST build a memory database
  if (process.env['NODE_ENV'] == 'test' && process.env['VITEST']) {
    return new Database(':memory:');
  }

  if (dbPath !== ':memory:' && !fs.existsSync(dbPath)) {
    try {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      console.log(`Created data directory at: ${path.dirname(dbPath)}`);
    } catch (error) {
      console.error(`Failed to create data directory: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to initialize database storage directory');
    }
  }

  let db: Database.Database;
  try {
    db = new Database(dbPath);
    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');
    return db;
  } catch (error) {
    console.error(`Database connection error: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error('Failed to connect to database');
  }
};

export { buildTables, createDatabase, getDbPath };
