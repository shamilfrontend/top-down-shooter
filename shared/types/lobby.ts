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

export interface BotsConfig {
  enabled: boolean;
  difficulty: BotDifficulty;
  count: number;
}

export interface RoomState {
  id: string;
  name: string;
  map: string;
  maxPlayers: number;
  roundsToWin: number;
  bots: BotsConfig;
  players: LobbyPlayer[];
  teams: { ct: LobbyPlayer[]; t: LobbyPlayer[] };
  hostId: string;
  status: 'waiting' | 'playing';
}
