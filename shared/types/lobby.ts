import type { TeamId } from './player';

export interface LobbyPlayer {
  socketId: string;
  userId?: string;
  username: string;
  team: TeamId;
  isReady: boolean;
  isHost: boolean;
}

export interface RoomListItem {
  id: string;
  name: string;
  map: string;
  maxPlayers: number;
  playerCount: number;
  hasPassword: boolean;
  status: 'waiting' | 'playing';
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

/** Один слот в комнате: либо игрок, либо бот, либо пусто */
export interface RoomSlot {
  team: TeamId;
  player: { socketId: string; userId?: string; username: string; isReady: boolean } | null;
  bot: { difficulty: BotDifficulty } | null;
}

/** Игрок в очереди (зашёл в комнату, ещё не выбрал слот) */
export interface PendingPlayer {
  socketId: string;
  userId?: string;
  username: string;
}

export interface RoomState {
  id: string;
  name: string;
  map: string;
  maxPlayers: number;
  roundsToWin: number;
  slots: RoomSlot[];
  pending: PendingPlayer[];
  hostId: string;
  status: 'waiting' | 'playing';
}
