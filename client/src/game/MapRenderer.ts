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
  private floorPattern: CanvasPattern | null = null;
  private wallPattern: CanvasPattern | null = null;

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
    this.buildPatterns();
  }

  /** Генерирует текстуры пола и стен на off-screen canvas */
  private buildPatterns() {
    // --- Текстура пола (бетон/песок) ---
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 64;
    fCanvas.height = 64;
    const fc = fCanvas.getContext('2d')!;
    fc.fillStyle = '#3a3a48';
    fc.fillRect(0, 0, 64, 64);
    // Шум для реалистичности
    for (let i = 0; i < 120; i++) {
      const rx = Math.random() * 64;
      const ry = Math.random() * 64;
      const brightness = 40 + Math.floor(Math.random() * 30);
      fc.fillStyle = `rgba(${brightness},${brightness},${brightness + 8},0.25)`;
      fc.fillRect(rx, ry, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // Линии трещин
    fc.strokeStyle = 'rgba(0,0,0,0.12)';
    fc.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      fc.beginPath();
      fc.moveTo(Math.random() * 64, Math.random() * 64);
      fc.lineTo(Math.random() * 64, Math.random() * 64);
      fc.stroke();
    }
    // Плитка
    fc.strokeStyle = 'rgba(255,255,255,0.04)';
    fc.lineWidth = 1;
    fc.strokeRect(0, 0, 64, 64);
    this.floorPattern = this.ctx.createPattern(fCanvas, 'repeat');

    // --- Текстура стен (кирпич) ---
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 32;
    wCanvas.height = 20;
    const wc = wCanvas.getContext('2d')!;
    wc.fillStyle = '#5a5a72';
    wc.fillRect(0, 0, 32, 20);
    // Горизонтальная линия раствора
    wc.fillStyle = 'rgba(0,0,0,0.25)';
    wc.fillRect(0, 9, 32, 2);
    // Вертикальная линия раствора (смещение для кирпичной кладки)
    wc.fillRect(15, 0, 2, 10);
    wc.fillRect(0, 10, 2, 10);
    wc.fillRect(31, 10, 1, 10);
    // Лёгкий шум
    for (let i = 0; i < 30; i++) {
      const rx = Math.random() * 32;
      const ry = Math.random() * 20;
      wc.fillStyle = `rgba(${60 + Math.floor(Math.random() * 40)},${60 + Math.floor(Math.random() * 30)},${80 + Math.floor(Math.random() * 30)},0.15)`;
      wc.fillRect(rx, ry, 1 + Math.random(), 1 + Math.random());
    }
    this.wallPattern = this.ctx.createPattern(wCanvas, 'repeat');
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

    // Фон за картой — тёмный
    ctx.fillStyle = '#10101a';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // ===== Пол карты — текстурированный бетон =====
    if (this.floorPattern) {
      ctx.fillStyle = this.floorPattern;
      ctx.fillRect(0, 0, map.width, map.height);
    } else {
      ctx.fillStyle = '#3a3a48';
      ctx.fillRect(0, 0, map.width, map.height);
    }

    // Разметка пола (крупные плиты)
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    const tileSize = 200;
    for (let gx = 0; gx <= map.width; gx += tileSize) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, map.height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= map.height; gy += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(map.width, gy);
      ctx.stroke();
    }

    // ===== Тени от стен (drop shadow) =====
    map.walls.forEach((wall) => {
      const sx = 6;
      const sy = 6;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(wall.x + sx, wall.y + sy, wall.width, wall.height);
    });

    // ===== Стены — текстура кирпича =====
    map.walls.forEach((wall) => {
      // Тело стены с текстурой
      if (this.wallPattern) {
        ctx.fillStyle = this.wallPattern;
      } else {
        ctx.fillStyle = '#5a5a72';
      }
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      // 3D эффект — верхняя и левая грань (свет)
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(wall.x, wall.y, wall.width, 4);
      ctx.fillRect(wall.x, wall.y, 4, wall.height);

      // Нижняя и правая грань (тень)
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(wall.x, wall.y + wall.height - 4, wall.width, 4);
      ctx.fillRect(wall.x + wall.width - 4, wall.y, 4, wall.height);

      // Тонкая обводка
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    });

    // ===== Препятствия =====
    map.obstacles.forEach((obs) => {
      const size = OBSTACLE_SIZES[obs.type] ?? 25;

      // Тень от препятствия
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      if (obs.type === 'barrel') {
        ctx.beginPath();
        ctx.arc(obs.x + size / 2 + 3, obs.y + size / 2 + 3, size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(obs.x + 3, obs.y + 3, size, size);
      }

      if (obs.type === 'crate') {
        // Деревянный ящик
        ctx.fillStyle = '#8B7530';
        ctx.fillRect(obs.x, obs.y, size, size);
        // Доски (горизонтальные)
        ctx.strokeStyle = '#6B5520';
        ctx.lineWidth = 1;
        for (let ly = obs.y + 6; ly < obs.y + size; ly += 7) {
          ctx.beginPath();
          ctx.moveTo(obs.x, ly);
          ctx.lineTo(obs.x + size, ly);
          ctx.stroke();
        }
        // Крестовина усиления
        ctx.strokeStyle = '#5a4418';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obs.x + 2, obs.y + 2);
        ctx.lineTo(obs.x + size - 2, obs.y + size - 2);
        ctx.moveTo(obs.x + size - 2, obs.y + 2);
        ctx.lineTo(obs.x + 2, obs.y + size - 2);
        ctx.stroke();
        // Гвозди по углам
        ctx.fillStyle = '#aaa';
        const nailOff = 4;
        ctx.fillRect(obs.x + nailOff - 1, obs.y + nailOff - 1, 2, 2);
        ctx.fillRect(obs.x + size - nailOff - 1, obs.y + nailOff - 1, 2, 2);
        ctx.fillRect(obs.x + nailOff - 1, obs.y + size - nailOff - 1, 2, 2);
        ctx.fillRect(obs.x + size - nailOff - 1, obs.y + size - nailOff - 1, 2, 2);
        // Обводка
        ctx.strokeStyle = '#3a2a10';
        ctx.lineWidth = 1;
        ctx.strokeRect(obs.x, obs.y, size, size);
        // Свет/тень 3D
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(obs.x, obs.y, size, 2);
        ctx.fillRect(obs.x, obs.y, 2, size);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(obs.x, obs.y + size - 2, size, 2);
        ctx.fillRect(obs.x + size - 2, obs.y, 2, size);
      } else if (obs.type === 'barrel') {
        const cx = obs.x + size / 2;
        const cy = obs.y + size / 2;
        const r = size / 2;
        // Основа бочки
        const bGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        bGrad.addColorStop(0, '#6a6a6a');
        bGrad.addColorStop(1, '#3a3a3a');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Обруч
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        // Внутренний обруч
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        // Обводка
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // ===== Спавн-точки CT — синие =====
    map.spawnPoints.ct.forEach((sp) => {
      ctx.fillStyle = 'rgba(60, 120, 200, 0.1)';
      ctx.strokeStyle = 'rgba(60, 120, 200, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sp.x + 15, sp.y + 15, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Стрелка направления
      ctx.fillStyle = 'rgba(60, 120, 200, 0.15)';
      ctx.beginPath();
      ctx.moveTo(sp.x + 15, sp.y + 5);
      ctx.lineTo(sp.x + 22, sp.y + 18);
      ctx.lineTo(sp.x + 8, sp.y + 18);
      ctx.closePath();
      ctx.fill();
    });

    // ===== Спавн-точки T — красные =====
    map.spawnPoints.t.forEach((sp) => {
      ctx.fillStyle = 'rgba(200, 70, 60, 0.1)';
      ctx.strokeStyle = 'rgba(200, 70, 60, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sp.x + 15, sp.y + 15, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(200, 70, 60, 0.15)';
      ctx.beginPath();
      ctx.moveTo(sp.x + 15, sp.y + 5);
      ctx.lineTo(sp.x + 22, sp.y + 18);
      ctx.lineTo(sp.x + 8, sp.y + 18);
      ctx.closePath();
      ctx.fill();
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
      const bob = Math.sin(time * 2.5 + p.x * 0.1) * 1.5;

      if (p.type === 'ammo') {
        // === Ящик с патронами (реалистичный) ===
        ctx.save();
        ctx.translate(p.x, p.y + bob);

        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-9, 1, 18, 10);

        // Основной корпус — тёмно-зелёный армейский ящик
        const boxW = 20;
        const boxH = 13;
        const bx = -boxW / 2;
        const by = -boxH / 2;
        const boxGrad = ctx.createLinearGradient(bx, by, bx, by + boxH);
        boxGrad.addColorStop(0, '#4a5a30');
        boxGrad.addColorStop(0.5, '#3a4a22');
        boxGrad.addColorStop(1, '#2c3818');
        ctx.fillStyle = boxGrad;
        ctx.fillRect(bx, by, boxW, boxH);

        // 3D грани
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(bx, by, boxW, 2);
        ctx.fillRect(bx, by, 2, boxH);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(bx, by + boxH - 2, boxW, 2);
        ctx.fillRect(bx + boxW - 2, by, 2, boxH);

        // Металлическая застёжка
        ctx.fillStyle = '#888';
        ctx.fillRect(-3, by, 6, 2.5);
        ctx.fillStyle = '#666';
        ctx.fillRect(-2, by + 0.5, 4, 1.5);

        // Маркировка — полоска
        ctx.fillStyle = 'rgba(180,160,60,0.5)';
        ctx.fillRect(bx + 3, by + boxH * 0.35, boxW - 6, 2.5);

        // Видимые патроны сверху (ряд гильз)
        ctx.fillStyle = '#c8a840';
        for (let i = 0; i < 5; i++) {
          const bx2 = -7 + i * 3.5;
          ctx.fillRect(bx2, by + 3, 2, 4);
          // Наконечник
          ctx.fillStyle = '#a06030';
          ctx.fillRect(bx2, by + 3, 2, 1.5);
          ctx.fillStyle = '#c8a840';
        }

        // Обводка
        ctx.strokeStyle = '#1e2a10';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.restore();
      } else if (p.type === 'medkit') {
        // === Аптечка (реалистичная) ===
        ctx.save();
        ctx.translate(p.x, p.y + bob);

        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 11, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Корпус чемоданчика — белый/светло-серый с градиентом
        const mkW = 20;
        const mkH = 16;
        const mx = -mkW / 2;
        const my = -mkH / 2;
        const mkGrad = ctx.createLinearGradient(mx, my, mx, my + mkH);
        mkGrad.addColorStop(0, '#f0f0f0');
        mkGrad.addColorStop(0.4, '#e8e8e8');
        mkGrad.addColorStop(1, '#d0d0d0');
        ctx.fillStyle = mkGrad;

        // Скруглённые углы
        const cr = 3;
        ctx.beginPath();
        ctx.moveTo(mx + cr, my);
        ctx.lineTo(mx + mkW - cr, my);
        ctx.quadraticCurveTo(mx + mkW, my, mx + mkW, my + cr);
        ctx.lineTo(mx + mkW, my + mkH - cr);
        ctx.quadraticCurveTo(mx + mkW, my + mkH, mx + mkW - cr, my + mkH);
        ctx.lineTo(mx + cr, my + mkH);
        ctx.quadraticCurveTo(mx, my + mkH, mx, my + mkH - cr);
        ctx.lineTo(mx, my + cr);
        ctx.quadraticCurveTo(mx, my, mx + cr, my);
        ctx.closePath();
        ctx.fill();

        // 3D грани
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(mx + cr, my, mkW - cr * 2, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(mx + cr, my + mkH - 2, mkW - cr * 2, 2);

        // Красный крест
        const crossW = 3.5;
        const crossH = 10;
        ctx.fillStyle = '#cc2020';
        ctx.fillRect(-crossW / 2, -crossH / 2, crossW, crossH);
        ctx.fillRect(-crossH / 2, -crossW / 2, crossH, crossW);
        // Тень внутри креста
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(-crossW / 2 + 0.5, -crossH / 2 + 0.5, crossW - 1, crossH - 1);
        ctx.fillRect(-crossH / 2 + 0.5, -crossW / 2 + 0.5, crossH - 1, crossW - 1);
        // Обводка креста
        ctx.strokeStyle = '#991515';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-crossW / 2, -crossH / 2, crossW, crossH);
        ctx.strokeRect(-crossH / 2, -crossW / 2, crossH, crossW);

        // Ручка чемоданчика сверху
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, my - 1, 4, Math.PI, 0);
        ctx.stroke();

        // Защёлки по бокам
        ctx.fillStyle = '#bbb';
        ctx.fillRect(mx + 2, -1, 2, 2);
        ctx.fillRect(mx + mkW - 4, -1, 2, 2);

        // Обводка корпуса
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx + cr, my);
        ctx.lineTo(mx + mkW - cr, my);
        ctx.quadraticCurveTo(mx + mkW, my, mx + mkW, my + cr);
        ctx.lineTo(mx + mkW, my + mkH - cr);
        ctx.quadraticCurveTo(mx + mkW, my + mkH, mx + mkW - cr, my + mkH);
        ctx.lineTo(mx + cr, my + mkH);
        ctx.quadraticCurveTo(mx, my + mkH, mx, my + mkH - cr);
        ctx.lineTo(mx, my + cr);
        ctx.quadraticCurveTo(mx, my, mx + cr, my);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
      }
    });

    ctx.restore();
  }
}
