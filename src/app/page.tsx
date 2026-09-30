import Link from 'next/link';
import { getDb } from '@/lib/db/client';
import { sections, subjects } from '@/lib/db/schema';

export default async function Home() {
  const db = getDb();

  const allSections = await db.select().from(sections).orderBy(sections.sortOrder);
  const allSubjects = await db.select().from(subjects).orderBy(subjects.sortOrder);

  return (
    <main className="container mt-8 mb-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-primary" style={{ marginBottom: 0, fontSize: '3rem' }}>✨ Lizora</h1>
        <Link href="/admin" className="btn-primary">Админка</Link>
      </header>

      <div className="flex flex-col gap-8">
        {allSections.map(section => {
          const sectionSubjects = allSubjects.filter(s => s.sectionId === section.id);

          return (
            <section key={section.id}>
              <h2>{section.title}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {sectionSubjects.map(subject => (
                  <Link
                    key={subject.id}
                    href={`/school/${subject.slug}`} // Для простоты пока все ссылки ведут на один обработчик или просто заглушки
                    className="card flex flex-col items-center justify-center text-center gap-4"
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ fontSize: '3rem' }}>{subject.icon || '📚'}</div>
                    <h3 style={{ margin: 0 }}>{subject.title}</h3>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
