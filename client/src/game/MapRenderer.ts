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

  getSize(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
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

  renderPickups(pickups: Array<{ id: string; type: string; x: number; y: number }>, playerX?: number, playerY?: number) {
    const { ctx, scale, offsetX, offsetY } = this;
    const time = Date.now() / 1000;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const GLOW_RADIUS = 80;
    pickups.forEach((p) => {
      const bob = Math.sin(time * 2.5 + p.x * 0.1) * 1.5;
      const near = playerX != null && playerY != null && (p.x - playerX) ** 2 + (p.y - playerY) ** 2 < GLOW_RADIUS * GLOW_RADIUS;
      if (near) {
        const pulse = 0.25 + 0.12 * Math.sin(time * 3);
        const glowG = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, 35);
        glowG.addColorStop(0, p.type === 'ammo' ? `rgba(255, 200, 80, ${pulse})` : `rgba(100, 180, 255, ${pulse})`);
        glowG.addColorStop(0.6, p.type === 'ammo' ? 'rgba(255, 180, 50, 0)' : 'rgba(80, 140, 200, 0)');
        glowG.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glowG;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 35, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p.type === 'ammo') {
        // === Ящик с патронами — заметный, яркие гильзы ===
        ctx.save();
        ctx.translate(p.x, p.y + bob);

        // Лёгкое свечение для заметности
        ctx.shadowColor = 'rgba(255, 180, 50, 0.5)';
        ctx.shadowBlur = 8;

        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(-10, 2, 22, 12);

        const boxW = 22;
        const boxH = 14;
        const bx = -boxW / 2;
        const by = -boxH / 2;
        const boxGrad = ctx.createLinearGradient(bx, by, bx, by + boxH);
        boxGrad.addColorStop(0, '#3d4d28');
        boxGrad.addColorStop(0.5, '#2d3d1a');
        boxGrad.addColorStop(1, '#1e2a10');
        ctx.fillStyle = boxGrad;
        ctx.fillRect(bx, by, boxW, boxH);

        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(bx, by, boxW, 2);
        ctx.fillRect(bx, by, 2, boxH);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(bx, by + boxH - 2, boxW, 2);
        ctx.fillRect(bx + boxW - 2, by, 2, boxH);

        // Яркая оранжево-жёлтая полоска (маркировка патронов)
        ctx.fillStyle = '#e8b830';
        ctx.fillRect(bx + 2, by + boxH * 0.3, boxW - 4, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(bx + 3, by + boxH * 0.3 + 0.5, boxW - 6, 2);

        // Гильзы — яркая латунь, крупнее и заметнее
        const brass = ctx.createLinearGradient(-8, by, 8, by);
        brass.addColorStop(0, '#ffd060');
        brass.addColorStop(0.5, '#e8a830');
        brass.addColorStop(1, '#c08020');
        ctx.fillStyle = brass;
        for (let i = 0; i < 6; i++) {
          const gx = -8 + i * 3.2;
          ctx.fillRect(gx, by + 2.5, 2.5, 5);
          ctx.fillStyle = '#b05020';
          ctx.fillRect(gx, by + 2.5, 2.5, 1.2);
          ctx.fillStyle = brass;
        }

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#4a6020';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.restore();
      } else if (p.type === 'armor') {
        // === Броня +10 — жилет с яркой меткой ===
        ctx.save();
        ctx.translate(p.x, p.y + bob);

        ctx.shadowColor = 'rgba(80, 140, 200, 0.4)';
        ctx.shadowBlur = 6;

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 3, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        const vestW = 20;
        const vestH = 16;
        const vx = -vestW / 2;
        const vy = -vestH / 2;
        const vestGrad = ctx.createLinearGradient(vx, vy, vx, vy + vestH);
        vestGrad.addColorStop(0, '#4a6a5a');
        vestGrad.addColorStop(0.4, '#3a5a4a');
        vestGrad.addColorStop(1, '#2a4a3a');
        ctx.fillStyle = vestGrad;
        const vr = 3;
        ctx.beginPath();
        ctx.moveTo(vx + vr, vy);
        ctx.lineTo(vx + vestW - vr, vy);
        ctx.quadraticCurveTo(vx + vestW, vy, vx + vestW, vy + vr);
        ctx.lineTo(vx + vestW, vy + vestH - vr);
        ctx.quadraticCurveTo(vx + vestW, vy + vestH, vx + vestW - vr, vy + vestH);
        ctx.lineTo(vx + vr, vy + vestH);
        ctx.quadraticCurveTo(vx, vy + vestH, vx, vy + vestH - vr);
        ctx.lineTo(vx, vy + vr);
        ctx.quadraticCurveTo(vx, vy, vx + vr, vy);
        ctx.closePath();
        ctx.fill();

        // Карман/пластина по центру (как у тактического жилета)
        ctx.fillStyle = 'rgba(60, 90, 70, 0.9)';
        ctx.fillRect(vx + 4, vy + 3, vestW - 8, vestH - 6);
        ctx.strokeStyle = 'rgba(100, 160, 120, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vx + 4, vy + 3, vestW - 8, vestH - 6);

        ctx.fillStyle = '#e8f0e8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+10', 0, 0);
        ctx.strokeStyle = '#1a3a22';
        ctx.lineWidth = 0.5;
        ctx.strokeText('+10', 0, 0);

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(vx, vy, vestW, 2);
        ctx.fillRect(vx, vy, 2, vestH);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(vx, vy + vestH - 2, vestW, 2);
        ctx.fillRect(vx + vestW - 2, vy, 2, vestH);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#2a4a32';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(vx + vr, vy);
        ctx.lineTo(vx + vestW - vr, vy);
        ctx.quadraticCurveTo(vx + vestW, vy, vx + vestW, vy + vr);
        ctx.lineTo(vx + vestW, vy + vestH - vr);
        ctx.quadraticCurveTo(vx + vestW, vy + vestH, vx + vestW - vr, vy + vestH);
        ctx.lineTo(vx + vr, vy + vestH);
        ctx.quadraticCurveTo(vx, vy + vestH, vx, vy + vestH - vr);
        ctx.lineTo(vx, vy + vr);
        ctx.quadraticCurveTo(vx, vy, vx + vr, vy);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
      } else if (p.type === 'medkit') {
        // === Аптечка — яркий красный крест, узнаваемая иконка ===
        ctx.save();
        ctx.translate(p.x, p.y + bob);

        ctx.shadowColor = 'rgba(220, 50, 50, 0.5)';
        ctx.shadowBlur = 8;

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 3, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        const mkW = 22;
        const mkH = 18;
        const mx = -mkW / 2;
        const my = -mkH / 2;
        const cr = 4;
        const mkGrad = ctx.createLinearGradient(mx, my, mx, my + mkH);
        mkGrad.addColorStop(0, '#f5f5f5');
        mkGrad.addColorStop(0.35, '#eaeaea');
        mkGrad.addColorStop(1, '#d5d5d5');
        ctx.fillStyle = mkGrad;
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

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(mx + cr, my, mkW - cr * 2, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(mx + cr, my + mkH - 2, mkW - cr * 2, 2);

        // Крест — яркий красный, крупнее, с белой обводкой для контраста
        const crossW = 4;
        const crossH = 12;
        const redGrad = ctx.createLinearGradient(-crossH / 2, 0, crossH / 2, 0);
        redGrad.addColorStop(0, '#e03030');
        redGrad.addColorStop(0.5, '#d02020');
        redGrad.addColorStop(1, '#b01010');
        ctx.fillStyle = redGrad;
        ctx.fillRect(-crossW / 2, -crossH / 2, crossW, crossH);
        ctx.fillRect(-crossH / 2, -crossW / 2, crossH, crossW);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-crossW / 2, -crossH / 2, crossW, crossH);
        ctx.strokeRect(-crossH / 2, -crossW / 2, crossH, crossW);
        ctx.strokeStyle = '#a01010';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-crossW / 2 + 0.5, -crossH / 2 + 0.5, crossW - 1, crossH - 1);
        ctx.strokeRect(-crossH / 2 + 0.5, -crossW / 2 + 0.5, crossH - 1, crossW - 1);

        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, my - 1.5, 5, Math.PI, 0);
        ctx.stroke();

        ctx.fillStyle = '#999';
        ctx.fillRect(mx + 3, -1.5, 2.5, 2.5);
        ctx.fillRect(mx + mkW - 5.5, -1.5, 2.5, 2.5);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#999';
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
