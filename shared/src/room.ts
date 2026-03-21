import type { Player } from './player';

export interface Room {
  id: string;
  name: string;
  password?: string;
  map: string;
  maxPlayers: number;
  players: Player[];
  teams: {
    ct: Player[];
    t: Player[];
  };
  roundsToWin: number;
  bots: {
    enabled: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    count: number;
  };
  status: 'waiting' | 'playing';
  createdAt: Date;
  host: string;
}
