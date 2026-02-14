import type { RoomState, RoomSlot, PendingPlayer, BotDifficulty } from 'top-down-cs-shared';
import type { TeamId } from '../types/lobby';

const DEFAULT_MAP = 'dust2';
const DEFAULT_MAX_PLAYERS = 10;
const DEFAULT_ROUNDS_TO_WIN = 10;

export interface RoomOptions {
  name: string;
  password?: string;
  map?: string;
  maxPlayers?: number;
  roundsToWin?: number;
  team?: TeamId;
}

interface Room {
  id: string;
  name: string;
  password?: string;
  map: string;
  maxPlayers: number;
  roundsToWin: number;
  slots: RoomSlot[];
  pending: Map<string, Omit<PendingPlayer, 'socketId'>>;
  hostId: string;
  status: 'waiting' | 'playing';
  createdAt: Date;
}

class RoomStoreClass {
  private rooms = new Map<string, Room>();

  create(hostSocketId: string, hostUserId: string | undefined, hostUsername: string, options: RoomOptions): Room {
    const id = crypto.randomUUID();
    const maxPlayers = options.maxPlayers ?? DEFAULT_MAX_PLAYERS;
    const hostTeam = options.team ?? 'ct';
    const half = Math.floor(maxPlayers / 2);
    const hostSlotIndex = hostTeam === 'ct' ? 0 : half;
    const slots: RoomSlot[] = [];
    for (let i = 0; i < maxPlayers; i++) {
      const team: TeamId = i < half ? 'ct' : 't';
      if (i === hostSlotIndex) {
        slots.push({
          team,
          player: { socketId: hostSocketId, userId: hostUserId, username: hostUsername, isReady: false },
          bot: null,
        });
      } else {
        slots.push({ team, player: null, bot: null });
      }
    }
    const room: Room = {
      id,
      name: options.name,
      password: options.password,
      map: options.map ?? DEFAULT_MAP,
      maxPlayers,
      roundsToWin: options.roundsToWin ?? DEFAULT_ROUNDS_TO_WIN,
      slots,
      pending: new Map(),
      hostId: hostSocketId,
      status: 'waiting',
      createdAt: new Date(),
    };
    this.rooms.set(id, room);
    return room;
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  getRoomBySocket(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.pending.has(socketId)) return room;
      if (room.slots.some((s) => s.player?.socketId === socketId)) return room;
    }
    return undefined;
  }

  list(): { id: string; name: string; map: string; maxPlayers: number; playerCount: number; hasPassword: boolean; status: 'waiting' | 'playing' }[] {
    return Array.from(this.rooms.values())
      .filter((r) => r.status === 'waiting')
      .map((r) => ({
        id: r.id,
        name: r.name,
        map: r.map,
        maxPlayers: r.maxPlayers,
        playerCount: this.countPlayersInRoom(r),
        hasPassword: !!r.password,
        status: r.status,
      }));
  }

  private countPlayersInRoom(room: Room): number {
    const inSlots = room.slots.filter((s) => s.player !== null).length;
    return inSlots + room.pending.size;
  }

  join(roomId: string, socketId: string, userId: string | undefined, username: string, password?: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Комната не найдена' };
    if (room.status !== 'waiting') return { success: false, error: 'Игра уже началась' };
    if (room.pending.has(socketId) || room.slots.some((s) => s.player?.socketId === socketId)) return { success: false, error: 'Вы уже в комнате' };
    if (room.password && room.password !== password) return { success: false, error: 'Неверный пароль' };
    const playersInSlots = room.slots.filter((s) => s.player !== null).length;
    if (playersInSlots + room.pending.size >= room.maxPlayers) return { success: false, error: 'Комната заполнена' };
    room.pending.set(socketId, { userId, username });
    return { success: true };
  }

  takeSlot(socketId: string, slotIndex: number): Room | undefined {
    const room = this.getRoomBySocket(socketId);
    if (!room) return undefined;
    if (slotIndex < 0 || slotIndex >= room.slots.length) return undefined;
    const slot = room.slots[slotIndex];
    if (slot.player !== null || slot.bot !== null) return undefined;
    const pending = room.pending.get(socketId);
    let username: string;
    let userId: string | undefined;
    if (pending) {
      username = pending.username;
      userId = pending.userId;
      room.pending.delete(socketId);
    } else {
      const currentSlot = room.slots.find((s) => s.player?.socketId === socketId);
      if (!currentSlot?.player) return undefined;
      username = currentSlot.player.username;
      userId = currentSlot.player.userId;
      currentSlot.player = null;
    }
    slot.player = { socketId, userId, username, isReady: false };
    return room;
  }

  leave(socketId: string): { roomId: string; newHostId?: string } | null {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;
    room.pending.delete(socketId);
    const slot = room.slots.find((s) => s.player?.socketId === socketId);
    if (slot) slot.player = null;
    const stillInRoom = room.pending.size > 0 || room.slots.some((s) => s.player !== null);
    if (!stillInRoom) {
      this.rooms.delete(room.id);
      return { roomId: room.id };
    }
    let newHostId: string | undefined;
    if (room.hostId === socketId) {
      const next = room.slots.find((s) => s.player !== null)?.player?.socketId ?? room.pending.keys().next().value;
      if (next) {
        room.hostId = next;
        newHostId = next;
      }
    }
    return { roomId: room.id, newHostId };
  }

  setReady(socketId: string, ready: boolean): Room | undefined {
    const room = this.getRoomBySocket(socketId);
    const slot = room?.slots.find((s) => s.player?.socketId === socketId);
    if (slot?.player) slot.player.isReady = ready;
    return room;
  }

  addBot(socketId: string, slotIndex: number, difficulty: BotDifficulty): Room | undefined {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.hostId !== socketId) return undefined;
    if (slotIndex < 0 || slotIndex >= room.slots.length) return undefined;
    const slot = room.slots[slotIndex];
    if (slot.player !== null || slot.bot !== null) return undefined;
    slot.bot = { difficulty };
    return room;
  }

  removeBot(socketId: string, slotIndex: number): Room | undefined {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.hostId !== socketId) return undefined;
    if (slotIndex < 0 || slotIndex >= room.slots.length) return undefined;
    const slot = room.slots[slotIndex];
    if (slot.bot === null) return undefined;
    slot.bot = null;
    return room;
  }

  toState(room: Room): RoomState {
    const pending: PendingPlayer[] = Array.from(room.pending.entries()).map(([socketId, p]) => ({ socketId, username: p.username, userId: p.userId }));
    return {
      id: room.id,
      name: room.name,
      map: room.map,
      maxPlayers: room.maxPlayers,
      roundsToWin: room.roundsToWin,
      slots: room.slots.map((s) => ({ ...s, player: s.player ? { ...s.player } : null, bot: s.bot ? { ...s.bot } : null })),
      pending,
      hostId: room.hostId,
      status: room.status,
    };
  }
}

export const RoomStore = new RoomStoreClass();
