'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function NewLessonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId');

  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  if (!categoryId) {
    return <div>Ошибка: не указана категория</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, categoryId }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/lesson/${data.lesson.id}`);
      router.refresh(); // чтобы обновить дерево в сайдбаре
    } else {
      alert('Ошибка при создании урока');
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-primary">Новый урок</h1>
      <div className="card mt-4" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Название урока</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Например: Квест 1"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !title}>
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </form>
      </div>
    </div>
  );
}
