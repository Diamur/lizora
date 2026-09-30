# Архитектура проекта Lizora

## Обзор

**Lizora** — профессиональный образовательный веб-ресурс, построенный на стеке **Next.js 16.3.7 (App Router)** с использованием **React 19**, **TypeScript** и **better-sqlite3** + **Drizzle ORM** для хранения данных.
Проект включает публичную часть для ученика и защищённую паролем панель администратора.

## Основной стек технологий

- **Фреймворк:** Next.js 16.3.7 (App Router), React 19
- **Стилизация:** Vanilla CSS (глобальные стили, без Tailwind)
- **База данных:** SQLite (через `better-sqlite3`) + `drizzle-orm`
- **Аутентификация:** `iron-session` (stateless, зашифрованные куки)
- **Хеширование паролей:** `bcryptjs`
- **Медиа:** Файловая система (`data/media/`) + `ffmpeg` для транскодирования `.wmv` → `.mp4`

## Структура директорий

```
src/
├── app/
│   ├── admin/
│   │   ├── (protected)/        # Route Group — защищённые страницы администратора
│   │   │   ├── layout.tsx      # Protected Layout: проверяет сессию, редиректит на /admin/login
│   │   │   ├── page.tsx        # Dashboard (/admin)
│   │   │   ├── AdminSidebar.tsx
│   │   │   └── lesson/[id]/    # Редактор урока
│   │   └── login/              # Страница входа — вне (protected), полностью публична
│   ├── api/
│   │   ├── auth/               # POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
│   │   ├── admin/              # CRUD уроков, категорий, дерева контента
│   │   ├── media/video/        # Загрузка и управление видеофайлами
│   │   └── stream/[publicId]/  # Потоковая отдача видео (HTTP Range Requests)
│   └── v/[publicId]/           # Публичная страница просмотра видео
└── lib/
    ├── db/
    │   ├── client.ts           # Singleton SQLite-соединение
    │   ├── schema.ts           # Схемы таблиц (Drizzle ORM)
    │   └── init.ts             # DDL-инициализация и seed начальных данных
    ├── storage.ts              # Абстракция файлового хранилища
    ├── transcoder.ts           # Интеграция с FFmpeg (фоновая конвертация)
    └── session.ts              # Работа с iron-session
```

## Защита административного раздела

Защита реализована через **Route Group `(protected)`** с Protected Layout — без Next.js Middleware:

1. `src/app/admin/(protected)/layout.tsx` — Server Component, при каждом запросе проверяет сессию `iron-session`. Если пользователь не авторизован, вызывает `redirect('/admin/login')`.
2. `src/app/admin/login/` — находится **вне** Route Group `(protected)`, поэтому полностью публична и никогда не попадает под protected layout. Это исключает циклический редирект.
3. Пароль верифицируется через `bcryptjs.compare()` с хешем из `ADMIN_PASSWORD_HASH` в `.env.local`.

## Конвертация видео (FFmpeg)

1. Пользователь загружает видео через `/api/media/video` (multipart/form-data).
2. Если файл — WMV (`video/x-ms-wmv` или расширение `.wmv`), он сохраняется как `originalPath`.
3. В БД создаётся запись с `conversionStatus: 'pending'`.
4. В фоне (через `child_process.spawn`, без блокировки HTTP-ответа) запускается:
   ```
   ffmpeg -i input.wmv -c:v libx264 -c:a aac -movflags +faststart output.mp4
   ```
5. При успехе: `conversionStatus → 'ready'`, `playbackPath` и `playbackMimeType: 'video/mp4'` сохраняются в БД.
6. При ошибке (в т.ч. отсутствие `ffmpeg` в PATH): `conversionStatus → 'failed'`.
7. `/api/stream/[publicId]` всегда отдаёт `playbackPath` (если есть), иначе `originalPath`.

## Видео не из WMV

Форматы MP4, WebM, MOV, AVI, MKV принимаются как есть: `conversionStatus` сразу `'ready'`, `playbackPath = originalPath`.
