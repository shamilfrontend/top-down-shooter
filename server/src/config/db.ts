import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import * as schema from '../db/schema';

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'top-down-cs.db');

let sqlite: Database.Database;
let _db: ReturnType<typeof drizzle>;

function ensureDataDir(): void {
  const dir = path.dirname(DATABASE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function getDb() {
  if (!_db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return _db;
}

export async function connectDB(): Promise<void> {
  try {
    ensureDataDir();
    sqlite = new Database(DATABASE_PATH);
    _db = drizzle(sqlite, { schema });

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        total_kills INTEGER NOT NULL DEFAULT 0,
        total_deaths INTEGER NOT NULL DEFAULT 0,
        games_played INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

    console.log('SQLite connected');
  } catch (error) {
    console.error('SQLite connection error:', error);
    process.exit(1);
  }
}
