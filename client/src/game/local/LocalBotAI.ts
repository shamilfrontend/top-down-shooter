export interface GameInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

import { hasLineOfSight as raycastHasLineOfSight, getWaypointAroundWall } from './raycast';

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlayerLike {
  id: string;
  team: 'ct' | 't';
  x: number;
  y: number;
  isAlive: boolean;
}

const BOT_NAMES = ['Bot Ivan', 'Bot Dmitry', 'Bot Alex', 'Bot Sergei'];

export function getBotName(index: number): string {
  return BOT_NAMES[index % BOT_NAMES.length];
}

function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotMapContext {
  mapWidth: number;
  mapHeight: number;
  enemySpawnPoints: { x: number; y: number }[];
  pickups?: { x: number; y: number; type: string }[];
}

const AMMO_SEEK_THRESHOLD = 15;
const HEALTH_SEEK_THRESHOLD = 40;
const ARMOR_SEEK_THRESHOLD = 50;

function getNearestPickupByType(
  botX: number,
  botY: number,
  pickups: { x: number; y: number; type: string }[] | undefined,
  type: string
): { gx: number; gy: number } | null {
  if (!pickups?.length) return null;
  const filtered = pickups.filter((p) => p.type === type);
  if (filtered.length === 0) return null;
  let best = filtered[0];
  let bestD = Math.hypot(best.x - botX, best.y - botY);
  for (let i = 1; i < filtered.length; i++) {
    const p = filtered[i];
    const d = Math.hypot(p.x - botX, p.y - botY);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return { gx: best.x, gy: best.y };
}

/** Цель для движения, когда враг не виден: аптечка / патроны / броня / враги / спавн */
function getHuntGoal(
  botX: number,
  botY: number,
  enemies: PlayerLike[],
  mapContext: BotMapContext | undefined,
  botId: string,
  tick: number,
  ammoReserve: number,
  health: number,
  armor: number
): { gx: number; gy: number } | null {
  const needsHealth = health <= HEALTH_SEEK_THRESHOLD;
  const needsAmmo = ammoReserve <= AMMO_SEEK_THRESHOLD;
  const needsArmor = armor < ARMOR_SEEK_THRESHOLD;
  const medkitGoal = needsHealth ? getNearestPickupByType(botX, botY, mapContext?.pickups, 'medkit') : null;
  const ammoGoal = needsAmmo ? getNearestPickupByType(botX, botY, mapContext?.pickups, 'ammo') : null;
  const armorGoal = needsArmor ? getNearestPickupByType(botX, botY, mapContext?.pickups, 'armor') : null;
  const pickupGoal = medkitGoal ?? ammoGoal ?? armorGoal;
  if (pickupGoal) return pickupGoal;
  if (enemies.length > 0) {
    const nearest = enemies.reduce((a, e) =>
      Math.hypot(e.x - botX, e.y - botY) < Math.hypot(a.x - botX, a.y - botY) ? e : a
    );
    return { gx: nearest.x, gy: nearest.y };
  }
  if (!mapContext || mapContext.enemySpawnPoints.length === 0) {
    if (mapContext) {
      const cx = mapContext.mapWidth / 2;
      const cy = mapContext.mapHeight / 2;
      const hash = (botId.split('').reduce((h, c) => h + c.charCodeAt(0), 0) + tick) % 100;
      const jitter = (hash - 50) * 2;
      return { gx: cx + jitter, gy: cy + (hash % 20 - 10) };
    }
    return null;
  }
  const sp = mapContext.enemySpawnPoints;
  const cx = sp.reduce((s, p) => s + p.x, 0) / sp.length;
  const cy = sp.reduce((s, p) => s + p.y, 0) / sp.length;
  const hash = (botId.split('').reduce((h, c) => h + c.charCodeAt(0), 0) + Math.floor(tick / 30)) % 100;
  const jitter = (hash - 50) * 1.5;
  return { gx: cx + jitter, gy: cy + (hash % 30 - 15) };
}

function applyMoveToward(input: GameInput, botX: number, botY: number, gx: number, gy: number) {
  const dx = gx - botX;
  const dy = gy - botY;
  const dist = Math.hypot(dx, dy);
  if (dist < 40) return;
  const mx = dx / dist;
  const my = dy / dist;
  if (mx > 0.25) input.right = true;
  else if (mx < -0.25) input.left = true;
  if (my > 0.25) input.down = true;
  else if (my < -0.25) input.up = true;
}

/** Цель движения: если прямая перекрыта стеной — идём к углу стены (обход). */
function getMoveTarget(
  botX: number, botY: number,
  gx: number, gy: number,
  walls: Wall[]
): { gx: number; gy: number } {
  if (raycastHasLineOfSight(botX, botY, gx, gy, walls)) return { gx, gy };
  const wp = getWaypointAroundWall(botX, botY, gx, gy, walls);
  return wp ?? { gx, gy };
}

export function computeBotAction(
  botId: string,
  botTeam: 'ct' | 't',
  botX: number,
  botY: number,
  botAngle: number,
  players: PlayerLike[],
  walls: Wall[],
  tick: number,
  difficulty: BotDifficulty = 'medium',
  mapContext?: BotMapContext,
  ammo = 999,
  ammoReserve = 999,
  health = 100,
  armor = 100
): { input: GameInput; angle: number; shoot: boolean; wantReload: boolean } {
  const totalAmmo = ammo + ammoReserve;
  const enemies = players.filter((p) => p.team !== botTeam && p.isAlive);
  const baseReaction = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.6 : 0.9;
  const aimError = difficulty === 'easy' ? 0.4 : difficulty === 'medium' ? 0.15 : 0.05;
  const moveFreq = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.5 : 0.85;
  const huntChance = difficulty === 'easy' ? 0.4 : difficulty === 'medium' ? 0.75 : 0.95;

  // Найти ближайшего видимого врага
  let target: PlayerLike | null = null;
  let minDist = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - botX, e.y - botY);
    if (d < minDist && raycastHasLineOfSight(botX, botY, e.x, e.y, walls)) {
      minDist = d;
      target = e;
    }
  }

  const reactionChance = minDist < 220 ? 1 : baseReaction;

  const input: GameInput = { up: false, down: false, left: false, right: false };
  let angle = botAngle;
  let shoot = false;
  let wantReload = false;

  const needsAmmo = totalAmmo <= AMMO_SEEK_THRESHOLD;
  const ammoGoal = needsAmmo ? getNearestPickupByType(botX, botY, mapContext?.pickups, 'ammo') : null;
  const pickupGoal = ammoGoal ?? (health <= HEALTH_SEEK_THRESHOLD ? getNearestPickupByType(botX, botY, mapContext?.pickups, 'medkit') : null)
    ?? (armor < ARMOR_SEEK_THRESHOLD ? getNearestPickupByType(botX, botY, mapContext?.pickups, 'armor') : null);

  if (totalAmmo === 0 && ammoGoal) {
    const moveTo = getMoveTarget(botX, botY, ammoGoal.gx, ammoGoal.gy, walls);
    applyMoveToward(input, botX, botY, moveTo.gx, moveTo.gy);
    angle = Math.atan2(moveTo.gy - botY, moveTo.gx - botX);
  } else if (ammo === 0 && ammoReserve > 0) {
    // Магазин пуст, но есть резерв — перезарядка + уклонение от врага
    wantReload = true;
    if (target) {
      const away = Math.atan2(botY - target.y, botX - target.x);
      const mx = Math.cos(away);
      const my = Math.sin(away);
      if (mx > 0.3) input.right = true;
      else if (mx < -0.3) input.left = true;
      if (my > 0.3) input.down = true;
      else if (my < -0.3) input.up = true;
      angle = Math.atan2(target.y - botY, target.x - botX);
    }
  } else if (target && Math.random() < reactionChance && ammo > 0) {
    // Есть видимая цель и патроны в магазине — бой
    const toTarget = Math.atan2(target.y - botY, target.x - botX);
    const err = (Math.random() - 0.5) * 2 * aimError * Math.PI;
    angle = toTarget + err;

    const diff = Math.abs(angleDiff(botAngle, angle));
    if (diff < 0.15) shoot = true;

    if (minDist > 250 && Math.random() < moveFreq) {
      const moveAngle = toTarget;
      const mx = Math.cos(moveAngle);
      const my = Math.sin(moveAngle);
      if (mx > 0.3) input.right = true;
      else if (mx < -0.3) input.left = true;
      if (my > 0.3) input.down = true;
      else if (my < -0.3) input.up = true;
    } else if (minDist < 150 && Math.random() < 0.5) {
      const away = Math.atan2(botY - target.y, botX - target.x);
      const mx = Math.cos(away);
      const my = Math.sin(away);
      if (mx > 0.3) input.right = true;
      else if (mx < -0.3) input.left = true;
      if (my > 0.3) input.down = true;
      else if (my < -0.3) input.up = true;
    }
  } else {
    // Нет видимой цели — патруль / поиск пикапов (с обходом стен)
    if (pickupGoal) {
      const moveTo = getMoveTarget(botX, botY, pickupGoal.gx, pickupGoal.gy, walls);
      applyMoveToward(input, botX, botY, moveTo.gx, moveTo.gy);
      angle = Math.atan2(moveTo.gy - botY, moveTo.gx - botX);
    } else {
      const goal = getHuntGoal(botX, botY, enemies, mapContext, botId, tick, totalAmmo, health, armor);
      if (goal && Math.random() < huntChance) {
        const moveTo = getMoveTarget(botX, botY, goal.gx, goal.gy, walls);
        applyMoveToward(input, botX, botY, moveTo.gx, moveTo.gy);
        angle = Math.atan2(moveTo.gy - botY, moveTo.gx - botX);
      } else if (tick % 40 < 20 && Math.random() < 0.25) {
        const dir = Math.floor((tick / 20 + botId.length) % 4);
        if (dir === 0) input.up = true;
        else if (dir === 1) input.down = true;
        else if (dir === 2) input.left = true;
        else input.right = true;
      }
    }
  }

  return { input, angle, shoot, wantReload };
}
