import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db/client';
import { media, contentBlocks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { saveFile, ensureMediaDirs } from '@/lib/storage';
import { isAllowedMime, ALLOWED_VIDEO_MIMES } from '@/lib/utils';
import { nanoid } from 'nanoid';

// Максимальный размер — из .env или 2 ГБ
const MAX_SIZE = parseInt(process.env.MAX_VIDEO_SIZE ?? '2147483648', 10);

// GET: список всех видео (только для админа)
export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const videos = await db
    .select()
    .from(media)
    .where(eq(media.type, 'video'));

  return NextResponse.json({ videos });
}

// POST: загрузка нового видео
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    ensureMediaDirs();

    // Парсим multipart/form-data
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Ожидается multipart/form-data' }, { status: 400 });
    }

    // Читаем тело запроса как буфер
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Парсим boundary из Content-Type
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      return NextResponse.json({ error: 'Не удалось найти boundary' }, { status: 400 });
    }

    // Используем простой парсер multipart
    const parsed = parseMultipart(buffer, boundaryMatch[1].trim());

    const filePart = parsed.files['file'];
    const title    = parsed.fields['title']       ?? '';
    const description = parsed.fields['description'] ?? '';
    const status   = parsed.fields['status']      ?? 'draft';
    const lessonId = parsed.fields['lessonId']    ?? '';

    if (!filePart) {
      return NextResponse.json({ error: 'Файл не прикреплён' }, { status: 400 });
    }

    // Проверяем размер
    if (filePart.data.length > MAX_SIZE) {
      return NextResponse.json({
        error: `Файл слишком большой. Максимум: ${Math.round(MAX_SIZE / 1024 / 1024)} МБ`
      }, { status: 413 });
    }

    // Проверяем MIME
    const mimeType = filePart.contentType ?? 'application/octet-stream';
    if (!isAllowedMime(mimeType, 'video')) {
      return NextResponse.json({
        error: `Недопустимый тип файла: ${mimeType}. Разрешены: ${ALLOWED_VIDEO_MIMES.join(', ')}`
      }, { status: 415 });
    }

    // Сохраняем файл
    const { storageName, originalPath } = await saveFile({
      type: 'video',
      originalName: filePart.filename ?? 'video.mp4',
      buffer: filePart.data,
      mimeType,
    });

    // Генерируем publicId
    const publicId = nanoid(12);

    // Записываем в БД
    const db = getDb();

    // Получаем максимальный sort_order для нового блока
    let sortOrder = 0;
    if (lessonId) {
      const existingBlocks = await db.select().from(contentBlocks).where(eq(contentBlocks.lessonId, parseInt(lessonId, 10)));
      if (existingBlocks.length > 0) {
        sortOrder = Math.max(...existingBlocks.map((b) => (b as { sortOrder: number }).sortOrder)) + 1;
      }
    }

    const isWmv = mimeType === 'video/x-ms-wmv' || (filePart.filename && filePart.filename.toLowerCase().endsWith('.wmv'));
    const needsConversion = isWmv;

    const [inserted] = await db.insert(media).values({
      publicId,
      originalName: filePart.filename ?? 'video.mp4',
      storageName,
      originalPath,
      playbackPath: needsConversion ? null : originalPath,
      originalMimeType: mimeType,
      playbackMimeType: needsConversion ? null : mimeType,
      conversionStatus: needsConversion ? 'pending' : 'ready',
      size: filePart.data.length,
      type: 'video',
      title: title || filePart.filename || 'Без названия',
      description: description || null,
      status: (status as 'draft' | 'unlisted' | 'published'),
    }).returning();

    if (lessonId) {
      await db.insert(contentBlocks).values({
        lessonId: parseInt(lessonId, 10),
        type: 'video',
        mediaId: inserted.id,
        sortOrder,
      });
    }

    if (needsConversion) {
      // Запускаем транскодирование в фоне (без await)
      const { transcodeVideoToMp4 } = await import('@/lib/transcoder');
      transcodeVideoToMp4(inserted.id, originalPath).catch(err => {
        console.error('[transcoder] Error transcoder:', err);
      });
    }

    return NextResponse.json({
      ok: true,
      video: inserted,
      url: `/v/${publicId}`,
    });

  } catch (error) {
    console.error('[api/media/video] Upload error:', error);
    return NextResponse.json({ error: 'Ошибка при загрузке файла' }, { status: 500 });
  }
}

// Простой multipart parser без зависимостей от Node.js fs/IncomingMessage
interface ParsedPart {
  filename?: string;
  contentType?: string;
  data: Buffer;
}

interface ParsedMultipart {
  fields: Record<string, string>;
  files:  Record<string, ParsedPart>;
}

function parseMultipart(buffer: Buffer, boundary: string): ParsedMultipart {
  const result: ParsedMultipart = { fields: {}, files: {} };
  const sep = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(buffer, sep);

  for (const part of parts) {
    if (part.length < 4) continue;
    // Найдём конец заголовков (CRLF CRLF)
    const headerEnd = indexOfCRLF2(part);
    if (headerEnd < 0) continue;

    const headerStr = part.slice(0, headerEnd).toString('utf8');
    const data = part.slice(headerEnd + 4); // пропускаем \r\n\r\n

    // Убираем trailing \r\n
    const body = (data.length >= 2 && data[data.length - 2] === 0x0d && data[data.length - 1] === 0x0a) ? data.slice(0, -2) : data;

    const cdMatch = headerStr.match(/content-disposition:[^;]+;([^\r\n]+)/i);
    if (!cdMatch) continue;

    const nameMatch = cdMatch[1].match(/name="([^"]+)"/i);
    const filenameMatch = cdMatch[1].match(/filename="([^"]+)"/i);
    const ctMatch = headerStr.match(/content-type:\s*([^\r\n]+)/i);

    if (!nameMatch) continue;
    const name = nameMatch[1];

    if (filenameMatch) {
      // Это файл
      result.files[name] = {
        filename: filenameMatch[1],
        contentType: ctMatch ? ctMatch[1].trim() : undefined,
        data: body,
      };
    } else {
      // Это текстовое поле
      result.fields[name] = body.toString('utf8');
    }
  }

  return result;
}

function splitBuffer(buf: Buffer, sep: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  let idx = buf.indexOf(sep, start);
  while (idx !== -1) {
    parts.push(buf.slice(start, idx));
    start = idx + sep.length;
    // Пропускаем \r\n после boundary
    if (buf[start] === 0x0d && buf[start + 1] === 0x0a) start += 2;
    idx = buf.indexOf(sep, start);
  }
  return parts.filter(p => p.length > 0);
}

function indexOfCRLF2(buf: Buffer): number {
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0x0d && buf[i+1] === 0x0a && buf[i+2] === 0x0d && buf[i+3] === 0x0a) {
      return i;
    }
  }
  return -1;
}
