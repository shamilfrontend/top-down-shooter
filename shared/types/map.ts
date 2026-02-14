export interface SpawnPoint {
  x: number;
  y: number;
}

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Obstacle {
  x: number;
  y: number;
  type: string;
}

export interface MapConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  spawnPoints: {
    ct: SpawnPoint[];
    t: SpawnPoint[];
  };
  walls: Wall[];
  obstacles: Obstacle[];
}
