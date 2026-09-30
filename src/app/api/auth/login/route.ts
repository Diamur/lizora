import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { compare } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body as { password: string };

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Пароль не указан' }, { status: 400 });
    }

    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
      return NextResponse.json(
        { error: 'Система не настроена. Установите ADMIN_PASSWORD_HASH в .env.local' },
        { status: 500 }
      );
    }

    const isValid = await compare(password, hash);

    if (!isValid) {
      // Небольшая задержка против брутфорса
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
    }

    const session = await getSession();
    session.isAdmin = true;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth/login]', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
