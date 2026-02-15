import { ref } from 'vue';
import type { MapConfig } from 'top-down-cs-shared';

const API_BASE = '/api';

const DEFAULT_MAPS: { id: string; name: string }[] = [
  { id: 'dust2', name: 'Dust II' },
  { id: 'mansion', name: 'Mansion' },
  { id: 'aim-centro', name: 'Aim Centro' },
];

/** Встроенные карты на случай недоступности API (тренировка без сервера). */
const FALLBACK_MAPS: Record<string, MapConfig> = {
  dust2: {
    id: 'dust2',
    name: 'Dust II',
    width: 2000,
    height: 2000,
    spawnPoints: {
      ct: [
        { x: 200, y: 1800 },
        { x: 300, y: 1750 },
        { x: 150, y: 1850 },
        { x: 250, y: 1900 },
        { x: 350, y: 1820 },
      ],
      t: [
        { x: 1800, y: 200 },
        { x: 1700, y: 250 },
        { x: 1850, y: 150 },
        { x: 1750, y: 100 },
        { x: 1650, y: 180 },
      ],
    },
    walls: [
      { x: 0, y: 0, width: 2000, height: 50 },
      { x: 0, y: 0, width: 50, height: 2000 },
      { x: 1950, y: 0, width: 50, height: 2000 },
      { x: 0, y: 1950, width: 2000, height: 50 },
      { x: 800, y: 350, width: 400, height: 60 },
      { x: 800, y: 1590, width: 400, height: 60 },
      { x: 900, y: 900, width: 200, height: 200 },
      { x: 350, y: 550, width: 150, height: 350 },
      { x: 1500, y: 1100, width: 150, height: 350 },
      { x: 500, y: 1200, width: 220, height: 60 },
      { x: 1280, y: 740, width: 220, height: 60 },
      { x: 150, y: 400, width: 200, height: 50 },
      { x: 1650, y: 1550, width: 200, height: 50 },
      { x: 600, y: 700, width: 60, height: 200 },
      { x: 1340, y: 1100, width: 60, height: 200 },
      { x: 1100, y: 500, width: 60, height: 180 },
      { x: 840, y: 1320, width: 60, height: 180 },
      { x: 400, y: 1500, width: 100, height: 50 },
      { x: 1500, y: 450, width: 100, height: 50 },
      { x: 700, y: 200, width: 50, height: 150 },
      { x: 1250, y: 1650, width: 50, height: 150 },
    ],
    obstacles: [
      { x: 950, y: 950, type: 'crate' },
      { x: 980, y: 1000, type: 'crate' },
      { x: 420, y: 620, type: 'barrel' },
      { x: 1520, y: 1170, type: 'barrel' },
      { x: 750, y: 500, type: 'crate' },
      { x: 1200, y: 1500, type: 'crate' },
      { x: 300, y: 1600, type: 'barrel' },
      { x: 1700, y: 400, type: 'barrel' },
      { x: 620, y: 1300, type: 'crate' },
      { x: 1380, y: 700, type: 'crate' },
      { x: 550, y: 900, type: 'barrel' },
      { x: 1450, y: 1050, type: 'barrel' },
    ],
  },
  mansion: {
    id: 'mansion',
    name: 'Mansion',
    width: 1800,
    height: 1600,
    theme: 'mansion',
    spawnPoints: {
      ct: [
        { x: 200, y: 1400 },
        { x: 350, y: 1350 },
        { x: 150, y: 1450 },
        { x: 300, y: 1500 },
      ],
      t: [
        { x: 1600, y: 200 },
        { x: 1450, y: 250 },
        { x: 1650, y: 150 },
        { x: 1500, y: 300 },
      ],
    },
    walls: [
      { x: 0, y: 0, width: 1800, height: 40 },
      { x: 0, y: 0, width: 40, height: 1600 },
      { x: 1760, y: 0, width: 40, height: 1600 },
      { x: 0, y: 1560, width: 1800, height: 40 },
      { x: 600, y: 280, width: 600, height: 50 },
      { x: 600, y: 1270, width: 600, height: 50 },
      { x: 700, y: 600, width: 400, height: 400 },
      { x: 220, y: 470, width: 200, height: 260 },
      { x: 1380, y: 870, width: 200, height: 260 },
      { x: 350, y: 900, width: 150, height: 60 },
      { x: 1300, y: 640, width: 150, height: 60 },
      { x: 500, y: 500, width: 50, height: 150 },
      { x: 1250, y: 950, width: 50, height: 150 },
      { x: 150, y: 800, width: 100, height: 40 },
      { x: 1550, y: 760, width: 100, height: 40 },
      { x: 800, y: 150, width: 40, height: 130 },
      { x: 960, y: 1320, width: 40, height: 130 },
      { x: 450, y: 1200, width: 100, height: 40 },
      { x: 1250, y: 360, width: 100, height: 40 },
      { x: 80, y: 850, width: 140, height: 12 },
      { x: 80, y: 958, width: 140, height: 12 },
      { x: 80, y: 862, width: 12, height: 96 },
      { x: 208, y: 862, width: 12, height: 96 },
    ],
    floorZones: [
      { x: 50, y: 500, width: 170, height: 230, type: 'parquet' },
      { x: 510, y: 520, width: 190, height: 80, type: 'parquet' },
      { x: 1110, y: 660, width: 270, height: 200, type: 'parquet' },
      { x: 620, y: 330, width: 380, height: 250, type: 'checkered' },
      { x: 620, y: 640, width: 80, height: 250, type: 'checkered' },
      { x: 1100, y: 640, width: 280, height: 250, type: 'checkered' },
      { x: 620, y: 920, width: 380, height: 340, type: 'checkered' },
      { x: 650, y: 1300, width: 260, height: 120, type: 'porch' },
      { x: 660, y: 800, width: 440, height: 50, type: 'path' },
      { x: 960, y: 750, width: 50, height: 220, type: 'path' },
      { x: 1010, y: 780, width: 200, height: 50, type: 'path' },
      { x: 1130, y: 760, width: 130, height: 130, type: 'fountainPlatform' },
      { x: 1155, y: 785, width: 80, height: 80, type: 'fountain' },
      { x: 1050, y: 720, width: 50, height: 60, type: 'bush' },
      { x: 1280, y: 750, width: 55, height: 55, type: 'bush' },
      { x: 1130, y: 680, width: 45, height: 50, type: 'bush' },
      { x: 1130, y: 900, width: 50, height: 45, type: 'bush' },
      { x: 700, y: 770, width: 40, height: 45, type: 'bush' },
      { x: 1180, y: 820, width: 60, height: 50, type: 'bush' },
      { x: 55, y: 760, width: 50, height: 55, type: 'bush' },
      { x: 1580, y: 820, width: 45, height: 50, type: 'bush' },
      { x: 55, y: 505, width: 60, height: 70, type: 'shadow' },
      { x: 150, y: 620, width: 50, height: 80, type: 'shadow' },
      { x: 530, y: 525, width: 80, height: 55, type: 'shadow' },
      { x: 1360, y: 900, width: 70, height: 80, type: 'shadow' },
      { x: 660, y: 785, width: 440, height: 18, type: 'hedge' },
      { x: 660, y: 867, width: 440, height: 18, type: 'hedge' },
      { x: 935, y: 750, width: 18, height: 220, type: 'hedge' },
      { x: 1027, y: 750, width: 18, height: 220, type: 'hedge' },
      { x: 1005, y: 765, width: 200, height: 15, type: 'hedge' },
      { x: 1005, y: 830, width: 200, height: 15, type: 'hedge' },
      { x: 1095, y: 785, width: 15, height: 90, type: 'hedge' },
      { x: 1105, y: 765, width: 120, height: 15, type: 'hedge' },
      { x: 80, y: 850, width: 140, height: 120, type: 'shack' },
      { x: 1460, y: 320, width: 60, height: 60, type: 'flowerBed' },
      { x: 1420, y: 1380, width: 80, height: 50, type: 'planter' },
    ],
    obstacles: [
      { x: 750, y: 650, type: 'crate' },
      { x: 850, y: 750, type: 'crate' },
      { x: 800, y: 700, type: 'crate' },
      { x: 270, y: 520, type: 'barrel' },
      { x: 1400, y: 900, type: 'barrel' },
      { x: 580, y: 1100, type: 'crate' },
      { x: 1200, y: 500, type: 'crate' },
      { x: 400, y: 1350, type: 'barrel' },
      { x: 1400, y: 250, type: 'barrel' },
      { x: 900, y: 400, type: 'barrel' },
      { x: 900, y: 1200, type: 'barrel' },
    ],
  },
  'aim-centro': {
    id: 'aim-centro',
    name: 'Aim Centro',
    width: 1600,
    height: 1600,
    spawnPoints: {
      ct: [
        { x: 400, y: 1450 },
        { x: 600, y: 1420 },
        { x: 800, y: 1460 },
        { x: 1000, y: 1430 },
        { x: 1200, y: 1450 },
      ],
      t: [
        { x: 400, y: 150 },
        { x: 600, y: 180 },
        { x: 800, y: 140 },
        { x: 1000, y: 170 },
        { x: 1200, y: 150 },
      ],
    },
    walls: [
      { x: 0, y: 0, width: 1600, height: 40 },
      { x: 0, y: 0, width: 40, height: 1600 },
      { x: 1560, y: 0, width: 40, height: 1600 },
      { x: 0, y: 1560, width: 1600, height: 40 },
      { x: 770, y: 770, width: 60, height: 60 },
      { x: 760, y: 650, width: 80, height: 70 },
      { x: 760, y: 880, width: 80, height: 70 },
      { x: 670, y: 760, width: 70, height: 80 },
      { x: 860, y: 760, width: 70, height: 80 },
      { x: 680, y: 670, width: 70, height: 70 },
      { x: 850, y: 850, width: 70, height: 70 },
      { x: 180, y: 650, width: 120, height: 300 },
      { x: 1300, y: 650, width: 120, height: 300 },
      { x: 80, y: 700, width: 80, height: 200 },
      { x: 260, y: 720, width: 60, height: 160 },
      { x: 1460, y: 700, width: 80, height: 200 },
      { x: 1280, y: 720, width: 60, height: 160 },
    ],
    floorZones: [
      { x: 730, y: 730, width: 140, height: 140, type: 'fountainPlatform' },
      { x: 755, y: 755, width: 90, height: 90, type: 'fountain' },
    ],
    obstacles: [
      { x: 120, y: 120, type: 'crate' },
      { x: 1470, y: 120, type: 'crate' },
      { x: 120, y: 1470, type: 'crate' },
      { x: 1470, y: 1470, type: 'crate' },
      { x: 350, y: 500, type: 'barrel' },
      { x: 1230, y: 500, type: 'barrel' },
      { x: 350, y: 1080, type: 'barrel' },
      { x: 1230, y: 1080, type: 'barrel' },
      { x: 620, y: 400, type: 'crate' },
      { x: 980, y: 400, type: 'crate' },
      { x: 620, y: 1180, type: 'crate' },
      { x: 980, y: 1180, type: 'crate' },
    ],
  },
};

const mapsList = ref<{ id: string; name: string }[]>([]);
const mapsCache = new Map<string, MapConfig>();

export function useMaps() {
  async function fetchMapsList() {
    try {
      const res = await fetch(`${API_BASE}/maps`);
      if (!res.ok) throw new Error('API error');
      mapsList.value = await res.json();
      if (!Array.isArray(mapsList.value) || mapsList.value.length === 0) {
        mapsList.value = [...DEFAULT_MAPS];
      }
    } catch {
      mapsList.value = [...DEFAULT_MAPS];
    }
    return mapsList.value;
  }

  async function fetchMap(id: string): Promise<MapConfig> {
    const cached = mapsCache.get(id);
    if (cached) return cached;

    try {
      const res = await fetch(`${API_BASE}/maps/${id}`);
      if (!res.ok) throw new Error('API error');
      const map = (await res.json()) as MapConfig;
      mapsCache.set(id, map);
      return map;
    } catch {
      const fallback = FALLBACK_MAPS[id];
      if (fallback) {
        mapsCache.set(id, fallback);
        return fallback;
      }
      throw new Error('Карта не найдена');
    }
  }

  return { mapsList, fetchMapsList, fetchMap };
}
