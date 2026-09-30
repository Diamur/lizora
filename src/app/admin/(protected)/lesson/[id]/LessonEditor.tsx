'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MediaInfo {
  id: number;
  publicId: string;
  title: string | null;
  status: string;
  conversionStatus: string;
}

interface Block {
  id: number;
  type: string;
  media?: MediaInfo | null;
}

interface Lesson {
  id: number;
  title: string;
}

export default function LessonEditor({ lesson, initialBlocks }: { lesson: Lesson; initialBlocks: Block[] }) {
  const [blocks] = useState(initialBlocks);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('status', 'unlisted'); // Сразу ставим unlisted, как просят в MVP
    formData.append('lessonId', String(lesson.id));

    setUploading(true);
    try {
      const res = await fetch('/api/media/video', {
        method: 'POST',
        body: formData, // fetch сам установит правильный Content-Type multipart/form-data с boundary
      });

      if (res.ok) {
        // Успешно загрузили — перезагружаем страницу, чтобы обновить блоки с сервера
        router.refresh();
        alert('Видео успешно загружено!');
      } else {
        const errData = await res.json() as { error?: string };
        alert(`Ошибка: ${errData.error}`);
      }
    } catch {
      alert('Ошибка при загрузке видео');
    } finally {
      setUploading(false);
      e.target.value = ''; // очищаем input
    }
  };

  const copyLink = (publicId: string) => {
    const url = `${window.location.origin}/v/${publicId}`;
    navigator.clipboard.writeText(url);
    alert('Ссылка скопирована!');
  };

  const deleteVideo = async (mediaId: number) => {
    if (!confirm('Точно удалить это видео?')) return;

    // В MVP можно просто удалить медиа
    const res = await fetch(`/api/media/video/${mediaId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      router.refresh();
    }
  };

  return (
    <div className="mt-8 flex flex-col gap-6">

      <div className="card">
        <h2 style={{ fontSize: '1.25rem' }}>Добавить видео</h2>
        <div className="mt-4">
          <input
            type="file"
            accept="video/mp4,video/webm,video/x-ms-wmv,.wmv"
            onChange={handleVideoUpload}
            disabled={uploading}
          />
          {uploading && <span className="ml-4 text-primary">Загрузка... Пожалуйста, подождите</span>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Блоки урока</h2>
        {blocks.length === 0 && <p className="text-gray-800">Урок пока пуст.</p>}

        <div className="flex flex-col gap-4">
          {blocks.map((block) => (
            <div key={block.id} className="card p-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'bold', marginRight: '1rem' }}>[{block.type.toUpperCase()}]</span>
                {block.type === 'video' && block.media && (
                  <span>
                    {block.media.title} (
                      Статус: {block.media.status},
                      Конвертация: {block.media.conversionStatus === 'pending' || block.media.conversionStatus === 'processing' ? 'Обработка видео...' : block.media.conversionStatus === 'ready' ? 'Готово' : 'Ошибка конвертации'}
                    )
                  </span>
                )}
              </div>

              {block.type === 'video' && block.media && (
                <div className="flex gap-4">
                  <a href={`/v/${block.media.publicId}`} target="_blank" className="text-primary font-bold" rel="noreferrer">
                    ▶ Смотреть
                  </a>
                  <button onClick={() => copyLink(block.media!.publicId)} className="text-primary font-bold">
                    🔗 Копировать ссылку
                  </button>
                  <button onClick={() => deleteVideo(block.media!.id)} style={{ color: 'red', fontWeight: 'bold' }}>
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
