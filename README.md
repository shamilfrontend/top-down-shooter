# Top Down CS

Top Down шутер в стиле Counter-Strike.

## Стек

- **Client**: Vue 3 + TypeScript + Vite, SCSS, Socket.IO-client
- **Server**: Node.js + Express + TypeScript, Socket.IO, SQLite (Drizzle ORM)

## Структура

```
top-down-cs/
├── client/          # Vue 3 приложение
├── server/          # Node.js сервер
└── shared/          # Общие типы
```

## Запуск

1. Установите зависимости: `yarn install`
2. Запустите dev-сервер: `yarn dev` (БД SQLite создаётся автоматически в `server/data/`)

Отдельно:
- `yarn dev:server` — только сервер (порт 3000)
- `yarn dev:client` — только клиент (порт 5173)

## Переменные окружения

- `DATABASE_PATH` — путь к файлу SQLite (по умолчанию: `./data/top-down-cs.db`)
- `PORT` — порт сервера (по умолчанию: 3000)
- `JWT_SECRET` — секрет для JWT (обязательно в production)

## API

- `POST /api/auth/register` — регистрация (email, username, password)
- `POST /api/auth/login` — вход (email, password)
- `GET /api/auth/me` — текущий пользователь (Authorization: Bearer token)

## Socket.IO события

**Комнаты:**
- `room:create`, `room:list`, `room:join`, `room:leave`
- `room:ready`, `room:changeTeam`, `room:start`

**Игра:**
- `player:move` — клиент→сервер (up, down, left, right, angle)
- `player:shoot` — клиент→сервер (выстрел)
- `player:reload` — клиент→сервер (перезарядка)
- `player:switchWeapon` — клиент→сервер (слот 0 или 1)
- `player:buy` — клиент→сервер (id оружия или 'armor')
- `game:state` — сервер→клиент (полное состояние при старте)
- `game:update` — сервер→клиент (обновления каждые 50ms)
- `game:event` — сервер→клиент: shot, hit, kill, reloadStart, roundEnd, roundStart, gameOver, pickupAmmo, pickupMedkit, pickupArmor
