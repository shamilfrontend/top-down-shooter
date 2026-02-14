interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlayerHitbox {
  id: string;
  team: 'ct' | 't';
  x: number;
  y: number;
  radius: number;
}

function lineSegmentIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number; y: number; t: number } | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), t };
  }
  return null;
}

function pointToSegmentDist(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number
): { dist: number; t: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const d = Math.hypot(px - x1, py - y1);
    return { dist: d, t: 0 };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const dist = Math.hypot(px - projX, py - projY);
  return { dist, t };
}

function raycastWalls(
  ox: number, oy: number,
  dx: number, dy: number,
  maxDist: number,
  walls: Wall[]
): number {
  const ex = ox + dx * maxDist;
  const ey = oy + dy * maxDist;
  let closestT = 1;

  for (const wall of walls) {
    const segments: [number, number, number, number][] = [
      [wall.x, wall.y, wall.x + wall.width, wall.y],
      [wall.x + wall.width, wall.y, wall.x + wall.width, wall.y + wall.height],
      [wall.x + wall.width, wall.y + wall.height, wall.x, wall.y + wall.height],
      [wall.x, wall.y + wall.height, wall.x, wall.y],
    ];
    for (const [x1, y1, x2, y2] of segments) {
      const hit = lineSegmentIntersection(ox, oy, ex, ey, x1, y1, x2, y2);
      if (hit && hit.t < closestT) closestT = hit.t;
    }
  }
  return closestT * maxDist;
}

export function raycast(
  ox: number, oy: number, angle: number,
  range: number, spread: number,
  walls: Wall[],
  players: PlayerHitbox[],
  excludeId: string
): { hitId: string; dist: number } | null {
  const spreadAngle = (Math.random() - 0.5) * spread * Math.PI;
  const dirX = Math.cos(angle + spreadAngle);
  const dirY = Math.sin(angle + spreadAngle);
  const wallDist = raycastWalls(ox, oy, dirX, dirY, range, walls);

  let closest: { hitId: string; dist: number } | null = null;
  const ex = ox + dirX * range;
  const ey = oy + dirY * range;

  for (const p of players) {
    if (p.id === excludeId) continue;
    const { dist: perpDist, t } = pointToSegmentDist(p.x, p.y, ox, oy, ex, ey);
    if (perpDist > p.radius) continue;
    const projDist = t * range;
    const hitDist = projDist - Math.sqrt(Math.max(0, p.radius * p.radius - perpDist * perpDist));
    if (hitDist < 0 || hitDist > wallDist) continue;
    if (!closest || hitDist < closest.dist) {
      closest = { hitId: p.id, dist: hitDist };
    }
  }
  return closest;
}
