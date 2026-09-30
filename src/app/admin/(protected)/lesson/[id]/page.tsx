import { getDb } from '@/lib/db/client';
import { lessons, contentBlocks, media } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import LessonEditor from './LessonEditor';

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, parseInt(id, 10)));

  if (!lesson) {
    return <div>Урок не найден</div>;
  }

  // Загружаем блоки урока вместе с медиа
  const blocks = await db
    .select({
      block: contentBlocks,
      media: media,
    })
    .from(contentBlocks)
    .leftJoin(media, eq(contentBlocks.mediaId, media.id))
    .where(eq(contentBlocks.lessonId, lesson.id))
    .orderBy(contentBlocks.sortOrder);

  // Форматируем блоки для удобства
  const formattedBlocks = blocks.map(b => ({
    ...b.block,
    media: b.media,
  }));

  return (
    <div>
      <h1 className="text-primary">{lesson.title}</h1>
      <LessonEditor lesson={lesson} initialBlocks={formattedBlocks} />
    </div>
  );
}
