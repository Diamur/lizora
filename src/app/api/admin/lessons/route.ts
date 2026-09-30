import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db/client';
import { lessons } from '@/lib/db/schema';
import { slugify } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, categoryId } = await request.json();
    if (!title || !categoryId) {
      return NextResponse.json({ error: 'Необходимо указать название и категорию' }, { status: 400 });
    }

    const db = getDb();
    const slug = slugify(title);

    const [lesson] = await db.insert(lessons).values({
      title,
      slug,
      categoryId: parseInt(categoryId, 10),
      status: 'draft',
    }).returning();

    return NextResponse.json({ ok: true, lesson });
  } catch (error) {
    console.error('[api/admin/lessons] POST error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
