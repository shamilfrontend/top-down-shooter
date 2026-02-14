"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayer = updatePlayer;
const PLAYER_RADIUS = 23;
const MOVE_SPEED = 1120;
const ACCELERATION = 5000;
const FRICTION = 0.85;
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
    const overlap = r - dist;
    const nx = dx / dist;
    const ny = dy / dist;
    return { x: cx + nx * overlap, y: cy + ny * overlap };
}
function updatePlayer(state, input, map, dt) {
    let { x, y, vx, vy, angle } = state;
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    const normX = len > 0 ? moveX / len : 0;
    const normY = len > 0 ? moveY / len : 0;
    vx += normX * ACCELERATION * dt;
    vy += normY * ACCELERATION * dt;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > MOVE_SPEED) {
        vx = (vx / speed) * MOVE_SPEED;
        vy = (vy / speed) * MOVE_SPEED;
    }
    vx *= FRICTION;
    vy *= FRICTION;
    x += vx * dt;
    y += vy * dt;
    x = Math.max(PLAYER_RADIUS, Math.min(map.width - PLAYER_RADIUS, x));
    y = Math.max(PLAYER_RADIUS, Math.min(map.height - PLAYER_RADIUS, y));
    const resolve = (wall) => {
        if (checkCircleRect(x, y, PLAYER_RADIUS, wall.x, wall.y, wall.width, wall.height)) {
            const resolved = resolveCircleRect(x, y, PLAYER_RADIUS, wall);
            x = resolved.x;
            y = resolved.y;
            const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
            const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
            const nx = (x - closestX) / (PLAYER_RADIUS || 1);
            const ny = (y - closestY) / (PLAYER_RADIUS || 1);
            const velDot = vx * nx + vy * ny;
            if (velDot < 0) {
                vx -= velDot * nx * 1.2;
                vy -= velDot * ny * 1.2;
            }
        }
    };
    for (const wall of map.walls)
        resolve(wall);
    for (const obs of map.obstacles) {
        const size = OBSTACLE_SIZES[obs.type] ?? 25;
        resolve({ x: obs.x, y: obs.y, width: size, height: size });
    }
    return { x, y, vx, vy, angle };
}
