import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { media } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { resolveStoragePath, fileExists } from '@/lib/storage';
import fs from 'fs';

/**
 * GET /api/stream/[publicId]
 *
 * Потоковая отдача видеофайла с поддержкой HTTP Range Requests.
 * Пользователь может перематывать видео без полной загрузки.
 *
 * Доступ:
 * - published: публичный
 * - unlisted: публичный по прямой ссылке
 * - draft: только для администратора
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;

  const db = getDb();
  const [video] = await db.select().from(media)
    .where(eq(media.publicId, publicId));

  if (!video) {
    return new NextResponse('Видео не найдено', { status: 404 });
  }

  // Черновики — только для администратора
  if (video.status === 'draft') {
    const session = await getSession();
    if (!session.isAdmin) {
      return new NextResponse('Не найдено', { status: 404 });
    }
  }

  const targetPath = video.playbackPath || video.originalPath;
  const targetMime = video.playbackMimeType || video.originalMimeType;

  // Проверяем существование файла
  if (!targetPath || !fileExists(targetPath)) {
    console.error(`[stream] Файл не найден: ${targetPath}`);
    return new NextResponse('Видеофайл недоступен', { status: 503 });
  }

  const filePath = resolveStoragePath(targetPath);
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const rangeHeader = request.headers.get('range');

  if (rangeHeader) {
    // Обрабатываем Range Request (перемотка)
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!rangeMatch) {
      return new NextResponse('Invalid Range', { status: 416 });
    }

    const start = parseInt(rangeMatch[1], 10);
    const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1);

    if (start >= fileSize || end >= fileSize) {
      return new NextResponse('Range Not Satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    return new NextResponse(fileStream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type':   targetMime,
        'Cache-Control':  'no-cache',
      },
    });
  }

  // Полный файл (без Range)
  const fileStream = fs.createReadStream(filePath);
  return new NextResponse(fileStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Accept-Ranges':  'bytes',
      'Content-Length': String(fileSize),
      'Content-Type':   targetMime,
      'Cache-Control':  'no-cache',
    },
  });
}
