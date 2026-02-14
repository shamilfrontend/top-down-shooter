export interface GameInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

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

export function computeBotAction(
  botId: string,
  botTeam: 'ct' | 't',
  botX: number,
  botY: number,
  botAngle: number,
  players: PlayerLike[],
  walls: Wall[],
  tick: number
): { input: GameInput; angle: number; shoot: boolean } {
  const enemies = players.filter((p) => p.team !== botTeam && p.isAlive);
  const reactionChance = 0.6;
  const aimError = 0.15;
  const moveFreq = 0.5;

  let target: PlayerLike | null = null;
  let minDist = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - botX, e.y - botY);
    if (d < minDist && hasLineOfSight(botX, botY, e.x, e.y, walls)) {
      minDist = d;
      target = e;
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
  } else if (tick % 60 < 30 && Math.random() < 0.1) {
    const dir = Math.floor(Math.random() * 4);
    if (dir === 0) input.up = true;
    else if (dir === 1) input.down = true;
    else if (dir === 2) input.left = true;
    else input.right = true;
  }

  return { input, angle, shoot };
}
