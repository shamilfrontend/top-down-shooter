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
}

export const CREDITS_KILL = 300;
export const CREDITS_ROUND_WIN = 3250;
export const CREDITS_ROUND_LOSS = 1400;
export const CREDITS_START = 800;

export const WEAPONS: Record<string, WeaponDef> = {
  usp: {
    id: 'usp',
    name: 'USP-S',
    damage: 35,
    magazineSize: 12,
    fireRateMs: 150,
    reloadTimeMs: 2200,
    range: 540,
    spread: 0.02,
  },
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    damage: 36,
    magazineSize: 30,
    fireRateMs: 100,
    reloadTimeMs: 2500,
    range: 621,
    spread: 0.04,
    price: 2700,
  },
  m4: {
    id: 'm4',
    name: 'M4A1',
    damage: 33,
    magazineSize: 30,
    fireRateMs: 90,
    reloadTimeMs: 3100,
    range: 621,
    spread: 0.03,
    price: 3100,
  },
};

export const START_WEAPONS: Record<'ct' | 't', string> = {
  ct: 'usp',
  t: 'usp',
};
