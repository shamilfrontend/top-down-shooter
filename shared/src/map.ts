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

export type FloorZoneType = 'grass' | 'parquet' | 'checkered' | 'path' | 'porch' | 'fountain' | 'fountainPlatform' | 'bush' | 'hedge' | 'shadow' | 'shack' | 'flowerBed' | 'planter';

export interface FloorZone {
  x: number;
  y: number;
  width: number;
  height: number;
  type: FloorZoneType;
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
  /** Тема карты для визуального стиля (mansion = особняк с садом) */
  theme?: 'default' | 'mansion';
  /** Зоны пола для тематических карт (трава, паркет, шахматная плитка, дорожки, фонтан) */
  floorZones?: FloorZone[];
}
