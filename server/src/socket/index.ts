import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RoomStore } from '../game/RoomStore';
import { startGameSession, getGameSession, stopGameSession } from '../game/GameSession';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface SocketAuth {
  userId?: string;
  username: string;
}

function getAuth(socket: Socket): SocketAuth | null {
  const token = socket.handshake.auth?.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId?: string;
      email?: string;
      username?: string;
    };
    return {
      userId: decoded.userId,
      username: decoded.username || decoded.email?.split('@')[0] || decoded.userId || socket.id,
    };
  } catch {
    return null;
  }
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const auth = getAuth(socket);
    const username = auth?.username || `Guest-${socket.id.slice(0, 6)}`;

    socket.on('ping', (payload: { t?: number }) => {
      socket.emit('pong', { t: payload?.t ?? Date.now() });
    });

    socket.on('room:create', (options: { name: string; password?: string; map?: string; maxPlayers?: number; roundsToWin?: number; team?: 'ct' | 't' }) => {
      const room = RoomStore.create(socket.id, auth?.userId, username, {
        name: options.name || 'Комната',
        password: options.password,
        map: options.map,
        maxPlayers: options.maxPlayers,
        roundsToWin: options.roundsToWin,
        team: options.team,
      });
      socket.join(room.id);
      socket.emit('room:created', RoomStore.toState(room));
    });

    socket.on('room:list', () => {
      socket.emit('room:list', RoomStore.list());
    });

    socket.on('room:join', (data: { roomId: string; password?: string }) => {
      const result = RoomStore.join(data.roomId, socket.id, auth?.userId, username, data.password);
      if (!result.success) {
        socket.emit('room:error', result.error);
        return;
      }
      const room = RoomStore.get(data.roomId)!;
      socket.join(data.roomId);
      socket.emit('room:joined', RoomStore.toState(room));
      socket.to(data.roomId).emit('room:update', RoomStore.toState(room));
    });

    socket.on('room:leave', () => {
      const result = RoomStore.leave(socket.id);
      if (result) {
        socket.leave(result.roomId);
        socket.emit('room:left', { roomId: result.roomId });
        const room = RoomStore.get(result.roomId);
        if (room) {
          socket.to(result.roomId).emit('room:update', RoomStore.toState(room));
        }
      }
    });

    socket.on('room:ready', (ready: boolean) => {
      const room = RoomStore.setReady(socket.id, ready);
      if (room) {
        io.to(room.id).emit('room:update', RoomStore.toState(room));
      }
    });

    socket.on('room:takeSlot', (slotIndex: number) => {
      const room = RoomStore.takeSlot(socket.id, slotIndex);
      if (room) {
        io.to(room.id).emit('room:update', RoomStore.toState(room));
      }
    });

    socket.on('room:addBot', (data: { slotIndex: number; difficulty: 'easy' | 'medium' | 'hard' }) => {
      const room = RoomStore.addBot(socket.id, data.slotIndex, data.difficulty);
      if (room) {
        io.to(room.id).emit('room:update', RoomStore.toState(room));
      }
    });
    socket.on('room:removeBot', (data: { slotIndex: number }) => {
      const room = RoomStore.removeBot(socket.id, data.slotIndex);
      if (room) {
        io.to(room.id).emit('room:update', RoomStore.toState(room));
      }
    });

    socket.on('room:start', async () => {
      const room = RoomStore.getRoomBySocket(socket.id);
      if (!room || room.hostId !== socket.id) {
        socket.emit('room:error', 'Только хост может начать игру');
        return;
      }
      const filledSlots = room.slots.filter((s) => s.player !== null || s.bot !== null).length;
      if (filledSlots < 2) {
        socket.emit('room:error', 'Нужно минимум 2 занятых слота (игроки или боты)');
        return;
      }
      const allReady = room.slots.every((s) => !s.player || s.player.socketId === room.hostId || s.player.isReady);
      if (!allReady) {
        socket.emit('room:error', 'Все игроки должны быть готовы');
        return;
      }
      room.status = 'playing';
      io.to(room.id).emit('game:starting', { room: RoomStore.toState(room), mapId: room.map });

      const session = await startGameSession(io, room.id, room.map);
      if (session) {
        const state = session.getState();
        io.to(room.id).emit('game:state', state);
      } else {
        socket.emit('room:error', 'Ошибка загрузки карты');
        room.status = 'waiting';
      }
    });

    socket.on('player:move', (input: { up?: boolean; down?: boolean; left?: boolean; right?: boolean; angle?: number }) => {
      const room = RoomStore.getRoomBySocket(socket.id);
      if (!room?.id) return;
      const session = getGameSession(room.id);
      if (!session) return;
      session.setInput(socket.id, {
        up: !!input.up,
        down: !!input.down,
        left: !!input.left,
        right: !!input.right,
      });
      if (typeof input.angle === 'number') {
        session.setAngle(socket.id, input.angle);
      }
    });

    socket.on('player:shoot', () => {
      const room = RoomStore.getRoomBySocket(socket.id);
      if (!room?.id) return;
      const session = getGameSession(room.id);
      if (session) session.shoot(socket.id);
    });

    socket.on('player:reload', () => {
      const room = RoomStore.getRoomBySocket(socket.id);
      if (!room?.id) return;
      const session = getGameSession(room.id);
      if (session) session.reload(socket.id);
    });

    socket.on('player:buy', (weaponId: string) => {
      const room = RoomStore.getRoomBySocket(socket.id);
      if (!room?.id) return;
      const session = getGameSession(room.id);
      if (session) session.buyWeapon(socket.id, weaponId);
    });

    socket.on('player:switchWeapon', (slot: number) => {
      const room = RoomStore.getRoomBySocket(socket.id);
      if (!room?.id) return;
      const session = getGameSession(room.id);
      if (session && (slot === 0 || slot === 1)) session.switchWeapon(socket.id, slot as 0 | 1);
    });

    socket.on('disconnect', () => {
      const room = RoomStore.getRoomBySocket(socket.id);
      if (room) {
        const session = getGameSession(room.id);
        if (session) session.removePlayer(socket.id);
      }
      const result = RoomStore.leave(socket.id);
      if (result) {
        const r = RoomStore.get(result.roomId);
        if (r) {
          io.to(result.roomId).emit('room:update', RoomStore.toState(r));
        } else {
          stopGameSession(result.roomId);
        }
      }
    });
  });
}
