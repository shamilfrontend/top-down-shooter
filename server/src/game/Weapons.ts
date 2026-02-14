export interface WeaponDef {
  id: string;
  name: string;
  damage: number;
  magazineSize: number;
  fireRateMs: number;
  reloadTimeMs: number;
  range: number;
  spread: number;
  price?: number;
  maxReserve?: number;
}

export const CREDITS_KILL = 300;
export const CREDITS_ROUND_WIN = 3250;
export const CREDITS_ROUND_LOSS = 1400;
export const CREDITS_START = 800;

export const WEAPONS: Record<string, WeaponDef> = {
  usp: {
    id: 'usp',
    name: 'USP-S (Пистолет)',
    damage: 20,
    magazineSize: 12,
    fireRateMs: 150,
    reloadTimeMs: 2200,
    range: 300,
    spread: 0.02,
    maxReserve: 60,
  },
  m4: {
    id: 'm4',
    name: 'M4A1',
    damage: 20,
    magazineSize: 30,
    fireRateMs: 90,
    reloadTimeMs: 3100,
    range: 420,
    spread: 0.03,
    price: 3500,
    maxReserve: 120,
  },
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    damage: 35,
    magazineSize: 30,
    fireRateMs: 100,
    reloadTimeMs: 2500,
    range: 420,
    spread: 0.04,
    price: 5000,
    maxReserve: 120,
  },
};

export const START_WEAPONS: Record<'ct' | 't', string> = {
  ct: 'usp',
  t: 'usp',
};
