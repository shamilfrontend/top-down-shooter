export interface Weapon {
  id: string;
  name: string;
  damage: number;
  magazineSize: number;
  fireRate: number; // ms между выстрелами
  reloadTime: number; // ms
  spread?: number; // разброс
}
