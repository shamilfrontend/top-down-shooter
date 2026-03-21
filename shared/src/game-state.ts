import type { Player } from './player';
import type { MapConfig } from './map';

export type RoomStatus = 'waiting' | 'playing';

export interface GameState {
  roomId: string;
  map: MapConfig;
  players: Player[];
  round: number;
  roundWins: { ct: number; t: number };
  status: RoomStatus;
  roundTime: number;
  roundTimeLeft: number;
  winner?: 'ct' | 't' | null;
}
