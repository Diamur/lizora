import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// DATA_DIR — относительный путь от корня проекта, или абсолютный
const dataDir = process.env.DATA_DIR ?? './data';
const resolvedDataDir = path.isAbsolute(dataDir)
  ? dataDir
  : path.resolve(/*turbopackIgnore: true*/ process.cwd(), dataDir);

const dbDir = path.join(resolvedDataDir, 'database');

// Создаём директории при первом запуске
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'lizora.db');

// Singleton для SQLite соединения
let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getSqlite(): Database.Database {
  if (!_sqlite) {
    _sqlite = new Database(dbPath);
    // Включаем WAL mode для производительности
    _sqlite.pragma('journal_mode = WAL');
    _sqlite.pragma('foreign_keys = ON');
  }
  return _sqlite;
}

let _dbInitialized = false;

// Lazy import to avoid circular dependency at module load time
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { initDatabase } = require('./init') as typeof import('./init');

export function getDb() {
  if (!_db) {
    _db = drizzle(getSqlite(), { schema });
  }
  if (!_dbInitialized) {
    _dbInitialized = true;
    initDatabase();
  }
  return _db;
}

export { dbPath };
