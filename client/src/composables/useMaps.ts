import { ref } from 'vue';
import type { MapConfig } from 'top-down-cs-shared';

const API_BASE = '/api';

const mapsList = ref<{ id: string; name: string }[]>([]);
const mapsCache = new Map<string, MapConfig>();

export function useMaps() {
  async function fetchMapsList() {
    const res = await fetch(`${API_BASE}/maps`);
    if (!res.ok) throw new Error('Ошибка загрузки списка карт');
    mapsList.value = await res.json();
    return mapsList.value;
  }

  async function fetchMap(id: string): Promise<MapConfig> {
    const cached = mapsCache.get(id);
    if (cached) return cached;

    const res = await fetch(`${API_BASE}/maps/${id}`);
    if (!res.ok) throw new Error('Карта не найдена');
    const map = (await res.json()) as MapConfig;
    mapsCache.set(id, map);
    return map;
  }

  return { mapsList, fetchMapsList, fetchMap };
}
