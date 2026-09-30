import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Sections (Школа, Учи.ру) ────────────────────────────────────────────────
export const sections = sqliteTable('sections', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  title:     text('title').notNull(),
  slug:      text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  status:    text('status', { enum: ['active', 'hidden'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ─── Subjects (Математика, Русский язык, Программирование...) ────────────────
export const subjects = sqliteTable('subjects', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  sectionId: integer('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  title:     text('title').notNull(),
  slug:      text('slug').notNull(),
  icon:      text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
  status:    text('status', { enum: ['active', 'in_progress', 'hidden'] }).notNull().default('in_progress'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ─── Categories (Квесты, Звуки и буквы...) ───────────────────────────────────
// Поддерживает вложенность: parentId может ссылаться на другую category
export const categories = sqliteTable('categories', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  subjectId: integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  parentId:  integer('parent_id'),  // NULL = корневая категория
  title:     text('title').notNull(),
  slug:      text('slug').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  status:    text('status', { enum: ['active', 'in_progress', 'hidden'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ─── Lessons (Квест 1, Гласные...) ───────────────────────────────────────────
export const lessons = sqliteTable('lessons', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  title:      text('title').notNull(),
  slug:       text('slug').notNull(),
  sortOrder:  integer('sort_order').notNull().default(0),
  status:     text('status', { enum: ['active', 'draft', 'hidden'] }).notNull().default('draft'),
  createdAt:  text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt:  text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ─── Media (видео, изображения, документы) ────────────────────────────────────
export const media = sqliteTable('media', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  publicId:     text('public_id').notNull().unique(),        // случайный ID для публичных URL
  originalName: text('original_name').notNull(),            // исходное имя файла
  storageName:  text('storage_name').notNull(),             // имя на диске (UUID-based)
  originalPath: text('original_path').notNull(),            // относительный путь оригинального файла
  playbackPath: text('playback_path'),                      // относительный путь файла для веба (MP4)
  originalMimeType: text('original_mime_type').notNull(),
  playbackMimeType: text('playback_mime_type'),
  conversionStatus: text('conversion_status', { enum: ['pending', 'processing', 'ready', 'failed'] }).notNull().default('ready'),
  size:         integer('size').notNull(),                  // байты (оригинал)
  type:         text('type', { enum: ['video', 'image', 'document'] }).notNull(),
  title:        text('title'),
  description:  text('description'),
  status:       text('status', { enum: ['draft', 'unlisted', 'published'] }).notNull().default('draft'),
  metadata:     text('metadata'),                           // JSON строка для расширяемости
  createdAt:    text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt:    text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ─── ContentBlocks (блоки урока) ─────────────────────────────────────────────
export const contentBlocks = sqliteTable('content_blocks', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  lessonId:  integer('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  type:      text('type', { enum: ['theory', 'practice', 'photo', 'video'] }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  // Для текстовых блоков (theory, practice)
  content:   text('content'),                              // HTML от редактора
  // Для медиа блоков (photo, video)
  mediaId:   integer('media_id').references(() => media.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ─── TypeScript types ─────────────────────────────────────────────────────────
export type Section      = typeof sections.$inferSelect;
export type Subject      = typeof subjects.$inferSelect;
export type Category     = typeof categories.$inferSelect;
export type Lesson       = typeof lessons.$inferSelect;
export type Media        = typeof media.$inferSelect;
export type ContentBlock = typeof contentBlocks.$inferSelect;

export type InsertSection      = typeof sections.$inferInsert;
export type InsertSubject      = typeof subjects.$inferInsert;
export type InsertCategory     = typeof categories.$inferInsert;
export type InsertLesson       = typeof lessons.$inferInsert;
export type InsertMedia        = typeof media.$inferInsert;
export type InsertContentBlock = typeof contentBlocks.$inferInsert;
