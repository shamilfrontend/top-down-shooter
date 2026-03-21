# Top Down CS

Top Down шутер в стиле Counter-Strike.

## Стек

- **Client**: Vue 3 + TypeScript + Vite, SCSS, Socket.IO-client
- **Server**: Node.js + Express + TypeScript, Socket.IO

## Структура

```
top-down-cs/
├── client/          # Vue 3 приложение
├── server/          # Node.js сервер
└── shared/          # Общие типы
```

## Запуск

1. Установите зависимости: `yarn install`
2. Запустите dev-сервер: `yarn dev`

Отдельно:
- `yarn dev:server` — только сервер (порт 3001)
- `yarn dev:client` — только клиент (порт 5173)

## Деплой на VPS (Ubuntu)

1. Сборка: `yarn install && yarn build` (создаёт `server/dist/` и `client/dist/`).
2. Запуск только из **корня репозитория**, чтобы сервер отдавал статику из `client/dist`:
   ```bash
   cd /path/to/top-down-shooter
   node server/dist/index.js
   ```
3. Рекомендуется PM2: `pm2 start server/dist/index.js --name top-down-shooter` (из корня репо), затем `pm2 save` и `pm2 startup`.
4. Переменные окружения задать в `server/.env` при необходимости (например `PORT`).
5. Открыть порт в файрволе: `ufw allow 3001/tcp` (или нужный порт). Доступ: `http://ВНЕШНИЙ_IP:3001`.

## Переменные окружения

- `PORT` — порт сервера (по умолчанию: 3001)

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
