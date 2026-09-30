import { getDb } from '@/lib/db/client';
import { media } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';

export default async function VideoPlayerPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;

  const db = getDb();
  const [video] = await db.select().from(media).where(eq(media.publicId, publicId));

  if (!video) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh', background: '#000', color: 'white' }}>
        <h1>Видео не найдено</h1>
      </div>
    );
  }

  if (video.status === 'draft') {
    const session = await getSession();
    if (!session.isAdmin) {
      return (
        <div className="flex items-center justify-center" style={{ height: '100vh', background: '#000', color: 'white' }}>
          <h1>Видео недоступно</h1>
        </div>
      );
    }
  }

  // Используем API /api/stream/[publicId] для отдачи видео с поддержкой Range-запросов
  const streamUrl = `/api/stream/${publicId}`;

  return (
    <div className="video-player-container">
      <video
        className="video-player"
        controls
        controlsList="nodownload"
        playsInline
        preload="metadata"
        poster="/placeholder-video.jpg" // Если понадобится постер в будущем
      >
        <source src={streamUrl} type={video.playbackMimeType || video.originalMimeType} />
        Ваш браузер не поддерживает HTML5 video.
      </video>
    </div>
  );
}
