import type { Player, TeamId } from './player';

export type { TeamId };

export interface Team {
  id: TeamId;
  name: string;
  players: Player[];
  roundWins: number;
}
