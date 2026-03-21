import type { Wall } from './map';

/**
 * Пересечение отрезка (ox,oy)-(tx,ty) с прямоугольником стены.
 * Slab method — возвращает t входа (0..1) или null.
 */
function segmentIntersectAABBEntry(
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): number | null {
  const dx = tx - ox;
  const dy = ty - oy;
  let tmin = 0;
  let tmax = 1;

  if (Math.abs(dx) < 1e-10) {
    if (ox < minX || ox > maxX) return null;
  } else {
    let t1 = (minX - ox) / dx;
    let t2 = (maxX - ox) / dx;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dy) < 1e-10) {
    if (oy < minY || oy > maxY) return null;
  } else {
    let t1 = (minY - oy) / dy;
    let t2 = (maxY - oy) / dy;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  return tmin < tmax ? tmin : null;
}

function segmentIntersectsAABB(
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  return segmentIntersectAABBEntry(ox, oy, tx, ty, minX, minY, maxX, maxY) != null;
}

/**
 * Точка обхода: куда идти, если прямая (ox,oy)->(gx,gy) перекрыта стеной.
 */
export function getWaypointAroundWall(
  ox: number,
  oy: number,
  gx: number,
  gy: number,
  walls: Wall[],
  maxDist = 3000
): { wx: number; wy: number } | null {
  const dist = Math.hypot(gx - ox, gy - oy);
  if (dist > maxDist || dist < 1) return null;

  let bestT = Infinity;
  let bestWall: Wall | null = null;

  for (const wall of walls) {
    const t = segmentIntersectAABBEntry(
      ox,
      oy,
      gx,
      gy,
      wall.x,
      wall.y,
      wall.x + wall.width,
      wall.y + wall.height
    );
    if (t != null && t < bestT) {
      bestT = t;
      bestWall = wall;
    }
  }

  if (!bestWall) return null;

  const w = bestWall;
  const corners: { x: number; y: number }[] = [
    { x: w.x, y: w.y },
    { x: w.x + w.width, y: w.y },
    { x: w.x + w.width, y: w.y + w.height },
    { x: w.x, y: w.y + w.height },
  ];

  const entryX = ox + bestT * (gx - ox);
  const entryY = oy + bestT * (gy - oy);

  corners.sort(
    (a, b) => Math.hypot(a.x - entryX, a.y - entryY) - Math.hypot(b.x - entryX, b.y - entryY)
  );
  const nearEdgeCorners = [corners[0], corners[1]];
  const toGoal = (c: { x: number; y: number }) => Math.hypot(c.x - gx, c.y - gy);
  const best =
    toGoal(nearEdgeCorners[0]) <= toGoal(nearEdgeCorners[1])
      ? nearEdgeCorners[0]
      : nearEdgeCorners[1];

  return { wx: best.x, wy: best.y };
}

/** Прямая видимость от (ox,oy) до (tx,ty). */
export function hasLineOfSight(
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  walls: Wall[],
  maxDist = 3000
): boolean {
  const dist = Math.hypot(tx - ox, ty - oy);
  if (dist > maxDist || dist < 1) return false;

  for (const wall of walls) {
    if (
      segmentIntersectsAABB(
        ox,
        oy,
        tx,
        ty,
        wall.x,
        wall.y,
        wall.x + wall.width,
        wall.y + wall.height
      )
    ) {
      return false;
    }
  }
  return true;
}
