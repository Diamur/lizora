import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db/client';
import { sections, subjects, categories, lessons } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  // Получаем всё сразу для простоты, т.к. MVP и данных немного
  const allSections = await db.select().from(sections).orderBy(asc(sections.sortOrder));
  const allSubjects = await db.select().from(subjects).orderBy(asc(subjects.sortOrder));
  const allCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const allLessons = await db.select().from(lessons).orderBy(asc(lessons.sortOrder));

  // Собираем дерево
  const tree = allSections.map(sec => {
    const secSubjects = allSubjects.filter(s => s.sectionId === sec.id).map(sub => {
      // Только корневые категории предмета
      const subCategories = allCategories.filter(c => c.subjectId === sub.id && c.parentId === null).map(cat => {
        // Уроки в категории
        const catLessons = allLessons.filter(l => l.categoryId === cat.id);
        return { ...cat, lessons: catLessons };
      });
      return { ...sub, categories: subCategories };
    });
    return { ...sec, subjects: secSubjects };
  });

  return NextResponse.json({ tree });
}
