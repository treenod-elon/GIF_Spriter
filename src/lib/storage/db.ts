import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'vfx_spriter.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  // Ensure data directories exist
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, 'sprites'), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS sprites (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      input_type        TEXT NOT NULL,
      frame_count       INTEGER NOT NULL,
      frame_width       INTEGER NOT NULL,
      frame_height      INTEGER NOT NULL,
      sheet_width       INTEGER NOT NULL,
      sheet_height      INTEGER NOT NULL,
      fps               INTEGER NOT NULL DEFAULT 30,
      frame_positions   TEXT NOT NULL DEFAULT '[]',
      original_file_size INTEGER NOT NULL DEFAULT 0,
      category          TEXT NOT NULL DEFAULT 'Other',
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sprites_title ON sprites(title);
    CREATE INDEX IF NOT EXISTS idx_sprites_created_at ON sprites(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sprites_category ON sprites(category);
  `);

  // Migration: add tags column if not exists
  try {
    db.exec(`ALTER TABLE sprites ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`);
  } catch {
    // Column already exists — ignore
  }

  return db;
}
