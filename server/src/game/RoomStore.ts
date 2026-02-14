import type { BotsConfig } from 'top-down-cs-shared';
import type { LobbyPlayer, RoomState, TeamId } from '../types/lobby';

const DEFAULT_MAP = 'dust2';
const DEFAULT_MAX_PLAYERS = 10;
const DEFAULT_ROUNDS_TO_WIN = 10;

const DEFAULT_BOTS: BotsConfig = {
  enabled: false,
  difficulty: 'medium',
  count: 1,
};

export interface RoomOptions {
  name: string;
  password?: string;
  map?: string;
  maxPlayers?: number;
  roundsToWin?: number;
  bots?: Partial<BotsConfig>;
}

interface Room {
  id: string;
  name: string;
  password?: string;
  map: string;
  maxPlayers: number;
  roundsToWin: number;
  bots: BotsConfig;
  hostId: string;
  status: 'waiting' | 'playing';
  players: Map<string, LobbyPlayer>;
  createdAt: Date;
}

class RoomStoreClass {
  private rooms = new Map<string, Room>();

  create(hostSocketId: string, hostUserId: string | undefined, hostUsername: string, options: RoomOptions): Room {
    const id = crypto.randomUUID();
    const player: LobbyPlayer = {
      socketId: hostSocketId,
      userId: hostUserId,
      username: hostUsername,
      team: 'ct',
      isReady: false,
      isHost: true,
    };
    const room: Room = {
      id,
      name: options.name,
      password: options.password,
      map: options.map ?? DEFAULT_MAP,
      maxPlayers: options.maxPlayers ?? DEFAULT_MAX_PLAYERS,
      roundsToWin: options.roundsToWin ?? DEFAULT_ROUNDS_TO_WIN,
      bots: { ...DEFAULT_BOTS, ...options.bots },
      hostId: hostSocketId,
      status: 'waiting',
      players: new Map([[hostSocketId, player]]),
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
      if (room.players.has(socketId)) return room;
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
        playerCount: r.players.size,
        hasPassword: !!r.password,
        status: r.status,
      }));
  }

  join(roomId: string, socketId: string, userId: string | undefined, username: string, password?: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Комната не найдена' };
    if (room.status !== 'waiting') return { success: false, error: 'Игра уже началась' };
    if (room.players.size >= room.maxPlayers) return { success: false, error: 'Комната заполнена' };
    if (room.password && room.password !== password) return { success: false, error: 'Неверный пароль' };
    if (room.players.has(socketId)) return { success: false, error: 'Вы уже в комнате' };

    const team = this.getTeamWithFewerPlayers(room);
    const player: LobbyPlayer = {
      socketId,
      userId,
      username,
      team,
      isReady: false,
      isHost: false,
    };
    room.players.set(socketId, player);
    return { success: true };
  }

  leave(socketId: string): { roomId: string; newHostId?: string } | null {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;

    room.players.delete(socketId);

    if (room.players.size === 0) {
      this.rooms.delete(room.id);
      return { roomId: room.id };
    }

    let newHostId: string | undefined;
    if (room.hostId === socketId) {
      const nextHost = room.players.values().next().value as LobbyPlayer;
      if (nextHost) {
        nextHost.isHost = true;
        room.hostId = nextHost.socketId;
        newHostId = nextHost.socketId;
      }
    }

    return { roomId: room.id, newHostId };
  }

  setReady(socketId: string, ready: boolean): Room | undefined {
    const room = this.getRoomBySocket(socketId);
    const player = room?.players.get(socketId);
    if (player) player.isReady = ready;
    return room;
  }

  setBots(socketId: string, bots: Partial<BotsConfig>): Room | undefined {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.hostId !== socketId) return undefined;
    room.bots = { ...room.bots, ...bots };
    return room;
  }

  setTeam(socketId: string, team: TeamId): Room | undefined {
    const room = this.getRoomBySocket(socketId);
    const player = room?.players.get(socketId);
    if (!player) return undefined;

    const ctCount = Array.from(room!.players.values()).filter((p) => p.team === 'ct').length;
    const tCount = Array.from(room!.players.values()).filter((p) => p.team === 't').length;
    const maxPerTeam = Math.ceil(room!.maxPlayers / 2);
    const targetCount = team === 'ct' ? ctCount : tCount;
    const otherCount = team === 'ct' ? tCount : ctCount;

    if (player.team === team) return room;
    if (targetCount >= maxPerTeam && otherCount <= targetCount) return room;

    player.team = team;
    return room;
  }

  toState(room: Room): RoomState {
    const players = Array.from(room.players.values());
    return {
      id: room.id,
      name: room.name,
      map: room.map,
      maxPlayers: room.maxPlayers,
      roundsToWin: room.roundsToWin,
      bots: { ...room.bots },
      players,
      teams: {
        ct: players.filter((p) => p.team === 'ct'),
        t: players.filter((p) => p.team === 't'),
      },
      hostId: room.hostId,
      status: room.status,
    };
  }

  private getTeamWithFewerPlayers(room: Room): TeamId {
    let ct = 0,
      t = 0;
    for (const p of room.players.values()) {
      if (p.team === 'ct') ct++;
      else t++;
    }
    return ct <= t ? 'ct' : 't';
  }
}

export const RoomStore = new RoomStoreClass();
