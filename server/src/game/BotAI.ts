import type { GameInput } from './ServerPhysics';

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

interface MapLike {
  walls: Wall[];
  spawnPoints?: { ct: { x: number; y: number }[]; t: { x: number; y: number }[] };
}

function hasLineOfSight(
  ox: number, oy: number,
  tx: number, ty: number,
  walls: Wall[],
  maxDist = 2000
): boolean {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxDist) return false;
  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : 0;
  const ex = ox + nx * dist;
  const ey = oy + ny * dist;

  for (const wall of walls) {
    const segs: [number, number, number, number][] = [
      [wall.x, wall.y, wall.x + wall.width, wall.y],
      [wall.x + wall.width, wall.y, wall.x + wall.width, wall.y + wall.height],
      [wall.x + wall.width, wall.y + wall.height, wall.x, wall.y + wall.height],
      [wall.x, wall.y + wall.height, wall.x, wall.y],
    ];
    for (const [x1, y1, x2, y2] of segs) {
      const denom = (ox - ex) * (y1 - y2) - (oy - ey) * (x1 - x2);
      if (Math.abs(denom) < 1e-10) continue;
      const t = ((x1 - ox) * (y1 - y2) - (y1 - oy) * (x1 - x2)) / denom;
      const u = -((ox - ex) * (y1 - oy) - (oy - ey) * (x1 - ox)) / denom;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return false;
    }
  }
  return true;
}

function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

const BOT_NAMES = ['Bot Ivan', 'Bot Dmitry', 'Bot Alex', 'Bot Sergei', 'Bot Vlad', 'Bot Oleg', 'Bot Boris', 'Bot Yuri'];

export function getBotName(index: number): string {
  return BOT_NAMES[index % BOT_NAMES.length];
}

export function computeBotAction(
  botId: string,
  botTeam: 'ct' | 't',
  botX: number,
  botY: number,
  botAngle: number,
  players: PlayerLike[],
  map: MapLike,
  difficulty: BotDifficulty,
  tick: number
): { input: GameInput; angle: number; shoot: boolean } {
  const enemies = players.filter((p) => p.team !== botTeam && p.isAlive);
  const reactionChance = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.6 : 0.9;
  const aimError = difficulty === 'easy' ? 0.4 : difficulty === 'medium' ? 0.15 : 0.05;
  const moveTowardsTargetFreq = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.85 : 0.95;
  const huntFreq = difficulty === 'easy' ? 0.4 : difficulty === 'medium' ? 0.7 : 0.9;

  let target: PlayerLike | null = null;
  let minDist = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - botX, e.y - botY);
    if (d < minDist && hasLineOfSight(botX, botY, e.x, e.y, map.walls)) {
      minDist = d;
      target = e;
    }
  }

  let huntTargetX = botX;
  let huntTargetY = botY;
  let hasHuntTarget = false;
  if (enemies.length > 0) {
    let nearest = enemies[0];
    let nearestD = Math.hypot(nearest.x - botX, nearest.y - botY);
    for (const e of enemies) {
      const d = Math.hypot(e.x - botX, e.y - botY);
      if (d < nearestD) {
        nearestD = d;
        nearest = e;
      }
    }
    huntTargetX = nearest.x;
    huntTargetY = nearest.y;
    hasHuntTarget = true;
  } else if (map.spawnPoints) {
    const enemySpawns = botTeam === 'ct' ? map.spawnPoints.t : map.spawnPoints.ct;
    if (enemySpawns.length > 0) {
      huntTargetX = enemySpawns.reduce((s, p) => s + p.x, 0) / enemySpawns.length;
      huntTargetY = enemySpawns.reduce((s, p) => s + p.y, 0) / enemySpawns.length;
      hasHuntTarget = true;
    }
  }

  const input: GameInput = { up: false, down: false, left: false, right: false };
  let angle = botAngle;
  let shoot = false;

  if (target && Math.random() < reactionChance) {
    const toTarget = Math.atan2(target.y - botY, target.x - botX);
    const err = (Math.random() - 0.5) * 2 * aimError * Math.PI;
    angle = toTarget + err;

    const diff = Math.abs(angleDiff(botAngle, angle));
    if (diff < 0.15) shoot = true;

    if (minDist > 250 && Math.random() < moveTowardsTargetFreq) {
      const moveAngle = toTarget;
      const mx = Math.cos(moveAngle);
      const my = Math.sin(moveAngle);
      if (mx > 0.2) input.right = true;
      else if (mx < -0.2) input.left = true;
      if (my > 0.2) input.down = true;
      else if (my < -0.2) input.up = true;
    } else if (minDist < 120 && Math.random() < 0.5) {
      const away = Math.atan2(botY - target.y, botX - target.x);
      const mx = Math.cos(away);
      const my = Math.sin(away);
      if (mx > 0.3) input.right = true;
      else if (mx < -0.3) input.left = true;
      if (my > 0.3) input.down = true;
      else if (my < -0.3) input.up = true;
    }
  } else if (hasHuntTarget && Math.random() < huntFreq) {
    const dx = huntTargetX - botX;
    const dy = huntTargetY - botY;
    const dist = Math.hypot(dx, dy);
    if (dist > 80) {
      const moveAngle = Math.atan2(dy, dx);
      const mx = Math.cos(moveAngle);
      const my = Math.sin(moveAngle);
      if (mx > 0.25) input.right = true;
      else if (mx < -0.25) input.left = true;
      if (my > 0.25) input.down = true;
      else if (my < -0.25) input.up = true;
      angle = moveAngle;
    }
  } else if (tick % 40 < 20 && Math.random() < 0.15) {
    const dir = Math.floor(Math.random() * 4);
    if (dir === 0) input.up = true;
    else if (dir === 1) input.down = true;
    else if (dir === 2) input.left = true;
    else input.right = true;
  }

  return { input, angle, shoot };
}
