'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/admin');
      } else {
        const data = await res.json();
        setError(data.error || 'Ошибка входа');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 className="text-center" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Вход в Админку</h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="label">Пароль</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div style={{ color: 'red', fontSize: '0.875rem' }}>{error}</div>}

          <button type="submit" className="btn-primary mt-4" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
