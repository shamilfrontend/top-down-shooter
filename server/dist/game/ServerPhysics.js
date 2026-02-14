"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayer = updatePlayer;
const PLAYER_RADIUS = 23;
const MOVE_SPEED = 2200; // скорость перемещения игрока
const ACCELERATION = 5000;
const FRICTION = 0.85;
const MAX_PHYSICS_DT = 0.008; // суб-шаги для предотвращения прохождения сквозь стены
const OBSTACLE_SIZES = { crate: 30, barrel: 20 };
function checkCircleRect(cx, cy, r, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= r * r;
}
function resolveCircleRect(cx, cy, r, wall) {
    const closestX = Math.max(wall.x, Math.min(cx, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(cy, wall.y + wall.height));
    const dx = cx - closestX;
    const dy = cy - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq === 0 || distSq >= r * r)
        return { x: cx, y: cy };
    const dist = Math.sqrt(distSq);
    const overlap = r - dist + 0.5; // +0.5 запас от погрешности
    const nx = dx / dist;
    const ny = dy / dist;
    return { x: cx + nx * overlap, y: cy + ny * overlap };
}
function stepPhysics(x, y, vx, vy, input, map, dt) {
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    const normX = len > 0 ? moveX / len : 0;
    const normY = len > 0 ? moveY / len : 0;
    let nvx = vx + normX * ACCELERATION * dt;
    let nvy = vy + normY * ACCELERATION * dt;
    const speed = Math.sqrt(nvx * nvx + nvy * nvy);
    if (speed > MOVE_SPEED) {
        nvx = (nvx / speed) * MOVE_SPEED;
        nvy = (nvy / speed) * MOVE_SPEED;
    }
    nvx *= FRICTION;
    nvy *= FRICTION;
    let nx = x + nvx * dt;
    let ny = y + nvy * dt;
    nx = Math.max(PLAYER_RADIUS, Math.min(map.width - PLAYER_RADIUS, nx));
    ny = Math.max(PLAYER_RADIUS, Math.min(map.height - PLAYER_RADIUS, ny));
    const resolve = (wall) => {
        if (checkCircleRect(nx, ny, PLAYER_RADIUS, wall.x, wall.y, wall.width, wall.height)) {
            const resolved = resolveCircleRect(nx, ny, PLAYER_RADIUS, wall);
            nx = resolved.x;
            ny = resolved.y;
            const closestX = Math.max(wall.x, Math.min(nx, wall.x + wall.width));
            const closestY = Math.max(wall.y, Math.min(ny, wall.y + wall.height));
            const nnx = (nx - closestX) / (PLAYER_RADIUS || 1);
            const nny = (ny - closestY) / (PLAYER_RADIUS || 1);
            const velDot = nvx * nnx + nvy * nny;
            if (velDot < 0) {
                nvx -= velDot * nnx * 1.2;
                nvy -= velDot * nny * 1.2;
            }
        }
    };
    for (const wall of map.walls)
        resolve(wall);
    for (const obs of map.obstacles) {
        const size = OBSTACLE_SIZES[obs.type] ?? 25;
        resolve({ x: obs.x, y: obs.y, width: size, height: size });
    }
    return { x: nx, y: ny, vx: nvx, vy: nvy };
}
function updatePlayer(state, input, map, dt) {
    let { x, y, vx, vy, angle } = state;
    let remaining = dt;
    while (remaining > 0) {
        const step = Math.min(remaining, MAX_PHYSICS_DT);
        const next = stepPhysics(x, y, vx, vy, input, map, step);
        x = next.x;
        y = next.y;
        vx = next.vx;
        vy = next.vy;
        remaining -= step;
    }
    return { x, y, vx, vy, angle };
}
