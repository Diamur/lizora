import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { media } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { deleteFile } from '@/lib/storage';

// GET /api/media/video/[id] — данные видео
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const [video] = await db.select().from(media)
    .where(eq(media.id, parseInt(id, 10)));

  if (!video) {
    return NextResponse.json({ error: 'Видео не найдено' }, { status: 404 });
  }

  // Черновики видны только админу
  if (video.status === 'draft') {
    const session = await getSession();
    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    }
  }

  return NextResponse.json({ video });
}

// PATCH /api/media/video/[id] — обновление метаданных
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  type MediaStatus = 'draft' | 'unlisted' | 'published';
  interface PatchBody { title?: string; description?: string; status?: MediaStatus }
  const body = await request.json() as PatchBody;

  const updates: { title?: string; description?: string; status?: MediaStatus; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };

  if (body.title !== undefined)       updates.title       = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined)      updates.status      = body.status;

  const [updated] = await db.update(media)
    .set(updates)
    .where(eq(media.id, parseInt(id, 10)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Видео не найдено' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, video: updated });
}

// DELETE /api/media/video/[id] — удаление видео
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  const [video] = await db.select().from(media)
    .where(eq(media.id, parseInt(id, 10)));

  if (!video) {
    return NextResponse.json({ error: 'Видео не найдено' }, { status: 404 });
  }

  // Удаляем файлы с диска
  await deleteFile(video.originalPath);
  if (video.playbackPath && video.playbackPath !== video.originalPath) {
    await deleteFile(video.playbackPath);
  }

  // Удаляем запись из БД
  await db.delete(media).where(eq(media.id, parseInt(id, 10)));

  return NextResponse.json({ ok: true });
}
