import Link from 'next/link';

export default function SubjectStub() {
  return (
    <main className="container mt-8 mb-8 flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="card text-center" style={{ maxWidth: '400px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
        <h1 style={{ fontSize: '1.5rem' }}>Раздел пока готовится</h1>
        <p style={{ color: 'var(--color-gray-800)', marginBottom: '2rem' }}>
          Совсем скоро здесь появятся новые увлекательные уроки!
        </p>
        <Link href="/" className="btn-primary">Вернуться на главную</Link>
      </div>
    </main>
  );
}
