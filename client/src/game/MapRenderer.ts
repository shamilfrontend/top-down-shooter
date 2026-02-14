import type { MapConfig } from 'top-down-cs-shared';

const OBSTACLE_SIZES: Record<string, number> = { crate: 30, barrel: 20 };

export class MapRenderer {
  private ctx: CanvasRenderingContext2D;
  private map: MapConfig;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    ctx: CanvasRenderingContext2D,
    map: MapConfig,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.ctx = ctx;
    this.map = map;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  setSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setCamera(x: number, y: number, scale = 1) {
    this.offsetX = this.canvasWidth / 2 - x * scale;
    this.offsetY = this.canvasHeight / 2 - y * scale;
    this.scale = scale;
  }

  worldToScreen(wx: number, wy: number): [number, number] {
    return [wx * this.scale + this.offsetX, wy * this.scale + this.offsetY];
  }

  screenToWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.offsetX) / this.scale, (sy - this.offsetY) / this.scale];
  }

  applyWorldTransform(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
  }

  render() {
    const { ctx, map, scale, offsetX, offsetY } = this;

    ctx.save();

    // Фон — тёмный
    ctx.fillStyle = '#181820';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Пол карты — песочный/бетонный
    ctx.fillStyle = '#2e2e3e';
    ctx.fillRect(0, 0, map.width, map.height);

    // Сетка пола (тонкие линии)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1 / scale;
    const gridSize = 100;
    for (let gx = 0; gx <= map.width; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, map.height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= map.height; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(map.width, gy);
      ctx.stroke();
    }

    // Стены
    map.walls.forEach((wall) => {
      // Тело стены
      ctx.fillStyle = '#4a4a6a';
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      // Верхняя грань (свет)
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(wall.x, wall.y, wall.width, 3 / scale);

      // Левая грань (свет)
      ctx.fillRect(wall.x, wall.y, 3 / scale, wall.height);

      // Нижняя тень
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(wall.x, wall.y + wall.height - 3 / scale, wall.width, 3 / scale);

      // Правая тень
      ctx.fillRect(wall.x + wall.width - 3 / scale, wall.y, 3 / scale, wall.height);

      // Обводка
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1 / scale;
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    });

    // Препятствия
    map.obstacles.forEach((obs) => {
      const size = OBSTACLE_SIZES[obs.type] ?? 25;
      if (obs.type === 'crate') {
        // Деревянный ящик
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(obs.x, obs.y, size, size);
        // Крестовина
        ctx.strokeStyle = '#6B4F12';
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y);
        ctx.lineTo(obs.x + size, obs.y + size);
        ctx.moveTo(obs.x + size, obs.y);
        ctx.lineTo(obs.x, obs.y + size);
        ctx.stroke();
        // Обводка
        ctx.strokeStyle = '#4a3510';
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(obs.x, obs.y, size, size);
      } else if (obs.type === 'barrel') {
        // Бочка (круглая)
        const cx = obs.x + size / 2;
        const cy = obs.y + size / 2;
        const r = size / 2;
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Обруч
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        // Обводка
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1 / scale;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Спавн-точки CT — синие
    ctx.fillStyle = 'rgba(80, 140, 220, 0.15)';
    ctx.strokeStyle = 'rgba(80, 140, 220, 0.3)';
    ctx.lineWidth = 1 / scale;
    map.spawnPoints.ct.forEach((sp) => {
      ctx.beginPath();
      ctx.arc(sp.x + 15, sp.y + 15, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Спавн-точки T — красные
    ctx.fillStyle = 'rgba(220, 80, 80, 0.15)';
    ctx.strokeStyle = 'rgba(220, 80, 80, 0.3)';
    map.spawnPoints.t.forEach((sp) => {
      ctx.beginPath();
      ctx.arc(sp.x + 15, sp.y + 15, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }

  renderPickups(pickups: Array<{ id: string; type: string; x: number; y: number }>) {
    const { ctx, scale, offsetX, offsetY } = this;
    const time = Date.now() / 1000;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    pickups.forEach((p) => {
      const bob = Math.sin(time * 3 + p.x * 0.1) * 2;
      const glow = 0.4 + Math.sin(time * 2) * 0.15;

      if (p.type === 'ammo') {
        // Жёлтый ящик с патронами
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.shadowColor = 'rgba(200, 160, 40, 0.6)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(200, 160, 40, ${glow + 0.3})`;
        ctx.fillRect(-10, -7, 20, 14);
        ctx.strokeStyle = '#a08020';
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(-10, -7, 20, 14);
        // Буквы
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${8 / scale < 8 ? 8 : 8}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', 0, 0);
        ctx.restore();
      } else if (p.type === 'medkit') {
        // Аптечка — белый квадрат с красным крестом
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.shadowColor = 'rgba(46, 204, 113, 0.6)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(240, 240, 240, ${glow + 0.3})`;
        ctx.fillRect(-10, -10, 20, 20);
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeRect(-10, -10, 20, 20);
        // Красный крест
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-2, -7, 4, 14);
        ctx.fillRect(-7, -2, 14, 4);
        ctx.restore();
      }
    });

    ctx.restore();
  }
}
