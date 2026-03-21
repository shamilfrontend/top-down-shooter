export type TeamId = 'ct' | 't';

export interface Player {
  id: string;
  userId?: string;
  username: string;
  team: TeamId;
  x: number;
  y: number;
  angle: number;
  health: number;
  weapon: string;
  ammo: number;
  ammoReserve: number;
  isAlive: boolean;
  kills: number;
  deaths: number;
}
