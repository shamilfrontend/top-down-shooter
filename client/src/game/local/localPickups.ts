interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PICKUP_RADIUS = 25;
const AMMO_RESPAWN_MS = 30000;
const MEDKIT_RESPAWN_MS = 45000;
const AMMO_MAGAZINES = 1;

function isInWall(x: number, y: number, walls: Wall[], padding = 40): boolean {
  for (const w of walls) {
    const expX = w.x - padding;
    const expY = w.y - padding;
    const expW = w.width + padding * 2;
    const expH = w.height + padding * 2;
    if (x >= expX && x <= expX + expW && y >= expY && y <= expY + expH) return true;
  }
  return false;
}

function randomPos(mapWidth: number, mapHeight: number, walls: Wall[]): { x: number; y: number } {
  for (let i = 0; i < 50; i++) {
    const x = 80 + Math.random() * (mapWidth - 160);
    const y = 80 + Math.random() * (mapHeight - 160);
    if (!isInWall(x, y, walls)) return { x, y };
  }
  return { x: mapWidth / 2, y: mapHeight / 2 };
}

export interface PickupItem {
  id: string;
  type: 'ammo' | 'medkit';
  x: number;
  y: number;
  respawnAt: number;
}

export function createPickups(map: { width: number; height: number; walls: Wall[] }, count: { ammo: number; medkit: number }): PickupItem[] {
  const items: PickupItem[] = [];
  const used = new Set<string>();

  const add = (type: 'ammo' | 'medkit') => {
    const pos = randomPos(map.width, map.height, map.walls);
    const key = `${Math.floor(pos.x / 50)}_${Math.floor(pos.y / 50)}`;
    if (used.has(key)) return;
    used.add(key);
    items.push({
      id: `pickup_${items.length}`,
      type,
      x: pos.x,
      y: pos.y,
      respawnAt: 0,
    });
  };

  for (let i = 0; i < (count.ammo ?? 5); i++) add('ammo');
  for (let i = 0; i < (count.medkit ?? 3); i++) add('medkit');
  return items;
}

export function processPickups(
  pickups: PickupItem[],
  players: Array<{ id: string; x: number; y: number; health: number; weapon: string; ammoReserve: number; weaponAmmo?: Record<string, { ammo: number; reserve: number }>; isAlive: boolean }>,
  getMagazineSize: (weaponId: string) => number,
  now: number
): void {
  for (const p of pickups) {
    if (p.respawnAt > now) continue;

    for (const pl of players) {
      if (!pl.isAlive) continue;
      const dx = pl.x - p.x;
      const dy = pl.y - p.y;
      if (dx * dx + dy * dy > PICKUP_RADIUS * PICKUP_RADIUS) continue;

      if (p.type === 'ammo') {
        const magSize = getMagazineSize(pl.weapon) ?? 30;
        pl.ammoReserve += magSize * AMMO_MAGAZINES;
        if (pl.weaponAmmo?.[pl.weapon]) pl.weaponAmmo[pl.weapon].reserve = pl.ammoReserve;
      } else if (p.type === 'medkit') {
        pl.health = Math.min(100, pl.health + 20);
      }
      p.respawnAt = now + (p.type === 'ammo' ? AMMO_RESPAWN_MS : MEDKIT_RESPAWN_MS);
      break;
    }
  }
}

export function getActivePickups(pickups: PickupItem[], now: number): Array<{ id: string; type: string; x: number; y: number }> {
  return pickups
    .filter((p) => p.respawnAt <= now)
    .map((p) => ({ id: p.id, type: p.type, x: p.x, y: p.y }));
}
