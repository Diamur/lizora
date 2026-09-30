import { getDb } from './client';

/**
 * Инициализация схемы БД и начальных данных.
 * Вызывается при первом старте сервера.
 */
export function initDatabase() {
  const db = getDb();

  // Создаём таблицы (SQLite DDL)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqlite = (db as any).session.client as import('better-sqlite3').Database;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      slug       TEXT    NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status     TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden')),
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      title      TEXT    NOT NULL,
      slug       TEXT    NOT NULL,
      icon       TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status     TEXT    NOT NULL DEFAULT 'in_progress' CHECK(status IN ('active','in_progress','hidden')),
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      parent_id  INTEGER,
      title      TEXT    NOT NULL,
      slug       TEXT    NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status     TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','in_progress','hidden')),
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      slug        TEXT    NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      status      TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('active','draft','hidden')),
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS media (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id          TEXT    NOT NULL UNIQUE,
      original_name      TEXT    NOT NULL,
      storage_name       TEXT    NOT NULL,
      original_path      TEXT    NOT NULL,
      playback_path      TEXT,
      original_mime_type TEXT    NOT NULL,
      playback_mime_type TEXT,
      conversion_status  TEXT    NOT NULL DEFAULT 'ready' CHECK(conversion_status IN ('pending','processing','ready','failed')),
      size               INTEGER NOT NULL,
      type               TEXT    NOT NULL CHECK(type IN ('video','image','document')),
      title              TEXT,
      description        TEXT,
      status             TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','unlisted','published')),
      metadata           TEXT,
      created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS content_blocks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id  INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      type       TEXT    NOT NULL CHECK(type IN ('theory','practice','photo','video')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      content    TEXT,
      media_id   INTEGER REFERENCES media(id) ON DELETE SET NULL,
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);

  // Seed начальных данных (только если таблицы пусты)
  const existingSections = sqlite.prepare('SELECT COUNT(*) as count FROM sections').get() as { count: number };
  if (existingSections.count === 0) {
    seedInitialData(sqlite);
  }
}

function seedInitialData(sqlite: import('better-sqlite3').Database) {
  // Секции
  const insertSection = sqlite.prepare(
    `INSERT INTO sections (title, slug, sort_order, status) VALUES (?, ?, ?, ?)`
  );

  const schoolId = (insertSection.run('Школа', 'school', 1, 'active')).lastInsertRowid as number;
  const uchiId   = (insertSection.run('Учи.ру', 'uchi', 2, 'active')).lastInsertRowid as number;

  // Предметы секции "Школа"
  const insertSubject = sqlite.prepare(
    `INSERT INTO subjects (section_id, title, slug, sort_order, status, icon) VALUES (?, ?, ?, ?, ?, ?)`
  );

  insertSubject.run(schoolId, 'Математика',       'math',        1, 'in_progress', '🔢');
  insertSubject.run(schoolId, 'Русский язык',      'russian',     2, 'in_progress', '📝');
  insertSubject.run(schoolId, 'Окружающий мир',   'world',       3, 'in_progress', '🌍');
  insertSubject.run(schoolId, 'Чистописание',      'handwriting', 4, 'in_progress', '✏️');

  // Предметы секции "Учи.ру"
  insertSubject.run(uchiId, 'Английский язык', 'english',     1, 'in_progress', '🇬🇧');
  insertSubject.run(uchiId, 'Окружающий мир',  'world',       2, 'in_progress', '🌍');
  insertSubject.run(uchiId, 'Русский язык',    'russian',     3, 'in_progress', '📝');
  insertSubject.run(uchiId, 'Математика',      'math',        4, 'in_progress', '🔢');

  const progId = (insertSubject.run(uchiId, 'Программирование', 'programming', 5, 'active', '💻')).lastInsertRowid as number;

  // Категория "Квесты" в Программировании
  const insertCategory = sqlite.prepare(
    `INSERT INTO categories (subject_id, parent_id, title, slug, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)`
  );

  insertCategory.run(progId, null, 'Квесты', 'quests', 1, 'active');
}
