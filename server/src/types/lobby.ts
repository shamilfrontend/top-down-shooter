import type { BotsConfig } from 'top-down-cs-shared';

export type TeamId = 'ct' | 't';

export interface LobbyPlayer {
  socketId: string;
  userId?: string;
  username: string;
  team: TeamId;
  isReady: boolean;
  isHost: boolean;
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
