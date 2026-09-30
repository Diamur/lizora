import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// DATA_DIR — относительный путь от корня проекта
const dataDir = process.env.DATA_DIR ?? './data';
export const resolvedDataDir = path.isAbsolute(dataDir)
  ? dataDir
  : path.resolve(/*turbopackIgnore: true*/ process.cwd(), dataDir);

export const MEDIA_BASE = path.join(resolvedDataDir, 'media');

/**
 * Storage layer — абстракция над файловой системой.
 * В будущем можно заменить на S3/Object Storage без изменения остального кода.
 */

export type MediaType = 'video' | 'image' | 'document';

function getSubdir(type: MediaType): string {
  return type === 'video' ? 'videos' : type === 'image' ? 'images' : 'documents';
}

/**
 * Возвращает абсолютный путь к файлу по его storagePath.
 * storagePath хранится в БД как относительный (media/videos/uuid.mp4).
 */
export function resolveStoragePath(storagePath: string): string {
  return path.join(resolvedDataDir, storagePath);
}

/**
 * Сохраняет буфер/файл в storage и возвращает metadata.
 */
export async function saveFile(opts: {
  type: MediaType;
  originalName: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<{ storageName: string; originalPath: string }> {
  const ext = path.extname(opts.originalName).toLowerCase();
  const uuid = randomUUID();
  const storageName = `${uuid}${ext}`;
  const subdir = getSubdir(opts.type);
  const dirPath = path.join(MEDIA_BASE, subdir);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, storageName);
  await fs.promises.writeFile(filePath, opts.buffer);

  // Возвращаем относительный путь — он хранится в БД
  const originalPath = path.posix.join('media', subdir, storageName);
  return { storageName, originalPath };
}

/**
 * Удаляет файл из storage.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const fullPath = resolveStoragePath(storagePath);
  try {
    await fs.promises.unlink(fullPath);
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    // Файл уже не существует — нормально
  }
}

/**
 * Проверяет, существует ли файл.
 */
export function fileExists(storagePath: string): boolean {
  return fs.existsSync(resolveStoragePath(storagePath));
}

/**
 * Создаёт необходимые директории для media.
 */
export function ensureMediaDirs() {
  for (const sub of ['videos', 'images', 'documents']) {
    const p = path.join(MEDIA_BASE, sub);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
}
