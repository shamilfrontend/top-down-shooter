import { ref } from 'vue';
import type { MapConfig } from 'top-down-cs-shared';

const API_BASE = '/api';

const DEFAULT_MAPS: { id: string; name: string }[] = [
  { id: 'dust2', name: 'Dust II' },
  { id: 'mansion', name: 'Mansion' },
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
