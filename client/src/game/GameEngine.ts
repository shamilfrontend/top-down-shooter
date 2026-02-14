import type { MapConfig, Player } from 'top-down-cs-shared';
import { MapRenderer } from './MapRenderer';
import {
  type InputState,
  type LocalPlayerState,
  updateLocalPlayer,
  PLAYER_RADIUS,
} from './Physics';
import { InterpolationBuffer } from './InterpolationBuffer';

export interface ServerPlayer {
  id: string;
  x: number;
  y: number;
  angle: number;
  team: 'ct' | 't';
  username: string;
  health: number;
  weapon: string;
  ammo: number;
  ammoReserve: number;
  isAlive: boolean;
  kills: number;
  deaths: number;
  credits?: number;
  weapons?: [string | null, string];
  currentSlot?: number;
}

const FOG_RADIUS = 756;
const CAMERA_LERP = 0.1;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2;

// Размеры оружия для отрисовки (длина ствола от центра персонажа)
const WEAPON_VISUALS: Record<string, { len: number; width: number; color: string }> = {
  usp: { len: 20, width: 3, color: '#aaa' },
  ak47: { len: 30, width: 3.5, color: '#8B7355' },
  m4: { len: 28, width: 3.5, color: '#666' },
};

interface BulletTrail {
  x1: number; y1: number;
  x2: number; y2: number;
  time: number; // ms when created
}

export interface GameEngineOptions {
  canvas: HTMLCanvasElement;
  map: MapConfig;
  localPlayerId: string;
  onInput?: (state: { x: number; y: number; angle: number; up?: boolean; down?: boolean; left?: boolean; right?: boolean }) => void;
  onShoot?: () => void;
  onReload?: () => void;
  onHUDUpdate?: (state: { health: number; weapon: string; ammo: number; ammoReserve: number; kills: number; deaths: number; scoreCt: number; scoreT: number; credits?: number; weapons?: [string | null, string, string]; currentSlot?: number; round?: number; roundTimeLeft?: number }) => void;
  onSwitchWeapon?: (slot: 0 | 1) => void;
  onOpenShop?: () => void;
  networked?: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: MapConfig;
  private mapRenderer: MapRenderer;
  private localPlayerId: string;
  private onInput?: (state: { x: number; y: number; angle: number }) => void;
  private onShoot?: () => void;
  private onReload?: () => void;
  private onSwitchWeapon?: (slot: 0 | 1) => void;
  private onOpenShop?: () => void;
  private onHUDUpdate?: (state: { health: number; weapon: string; ammo: number; ammoReserve: number; kills: number; deaths: number; scoreCt: number; scoreT: number; credits?: number; weapons?: [string | null, string, string]; currentSlot?: number; round?: number; roundTimeLeft?: number }) => void;

  private localState: LocalPlayerState;
  private players: Player[] = [];
  private serverPlayers = new Map<string, InterpolationBuffer<ServerPlayer>>();
  private lastServerState: ServerPlayer[] = [];
  private pickups: Array<{ id: string; type: string; x: number; y: number }> = [];
  private input: InputState = { up: false, down: false, left: false, right: false };
  private mouseDown = false;
  private mouseX = 0;
  private mouseY = 0;
  private cameraX = 0;
  private cameraY = 0;
  private scale = 0.5;
  private fogOfWar = true;
  private lastTime = 0;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private networked: boolean;
  private inputSendInterval = 0;
  private bulletTrails: BulletTrail[] = [];

  constructor(options: GameEngineOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2d context not available');
    this.ctx = ctx;
    this.map = options.map as MapConfig;
    this.localPlayerId = options.localPlayerId;
    this.onInput = options.onInput;
    this.onShoot = options.onShoot;
    this.onReload = options.onReload;
    this.onSwitchWeapon = options.onSwitchWeapon;
    this.onOpenShop = options.onOpenShop;
    this.onHUDUpdate = options.onHUDUpdate;
    this.networked = !!options.networked;

    const rect = this.canvas.getBoundingClientRect();
    this.mapRenderer = new MapRenderer(ctx, this.map, rect.width, rect.height);
    this.scale = Math.min(
      rect.width / this.map.width,
      rect.height / this.map.height
    ) * 0.85;

    const spawn = this.map.spawnPoints.ct[0] || { x: 100, y: 100 };
    this.localState = {
      x: spawn.x + 30,
      y: spawn.y + 30,
      vx: 0,
      vy: 0,
      angle: 0,
    };
    this.cameraX = this.localState.x;
    this.cameraY = this.localState.y;

    this.setupInput();
  }

  private setupInput() {
    const keydown = (e: KeyboardEvent) => {
      const isRepeat = e.repeat;
      switch (e.code) {
        case 'KeyW':
          this.input.up = true;
          break;
        case 'KeyS':
          this.input.down = true;
          break;
        case 'KeyA':
          this.input.left = true;
          break;
        case 'KeyD':
          this.input.right = true;
          break;
        case 'KeyR':
          if (!isRepeat) this.onReload?.();
          break;
        case 'KeyB':
          if (!isRepeat) this.onOpenShop?.();
          break;
        case 'Digit1':
          if (!isRepeat) this.onSwitchWeapon?.(0);
          break;
        case 'Digit2':
          if (!isRepeat) this.onSwitchWeapon?.(1);
          break;
      }
    };
    const keyup = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          this.input.up = false;
          break;
        case 'KeyS':
          this.input.down = false;
          break;
        case 'KeyA':
          this.input.left = false;
          break;
        case 'KeyD':
          this.input.right = false;
          break;
      }
    };
    const mousedown = (e: MouseEvent) => {
      if (e.button === 0) this.mouseDown = true;
    };
    const mouseup = (e: MouseEvent) => {
      if (e.button === 0) this.mouseDown = false;
    };
    const mousemove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    this.canvas.addEventListener('mousemove', mousemove);
    this.canvas.addEventListener('mousedown', mousedown);
    window.addEventListener('mouseup', mouseup);

    this.cleanupInput = () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      this.canvas.removeEventListener('mousemove', mousemove);
      this.canvas.removeEventListener('mousedown', mousedown);
      window.removeEventListener('mouseup', mouseup);
    };
  }

  private cleanupInput?: () => void;

  setPlayers(players: Player[]) {
    this.players = players;
  }

  setServerState(
    players: ServerPlayer[],
    pickups?: Array<{ id: string; type: string; x: number; y: number }>,
    roundInfo?: { round: number; roundTimeLeft: number; roundWins?: { ct: number; t: number } }
  ) {
    if (pickups) this.pickups = pickups;
    if (roundInfo) this.setRoundInfo(roundInfo.round, roundInfo.roundTimeLeft, roundInfo.roundWins);
    this.lastServerState = players;
    const lerpPlayer = (a: ServerPlayer, b: ServerPlayer, t: number) => {
      let diff = b.angle - a.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return {
        ...b,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        angle: a.angle + diff * t,
      };
    };
    players.forEach((p) => {
      let buf = this.serverPlayers.get(p.id);
      if (!buf) {
        buf = new InterpolationBuffer<ServerPlayer>(lerpPlayer);
        this.serverPlayers.set(p.id, buf);
      }
      buf.add(p);
    });
  }

  addBulletTrail(x1: number, y1: number, x2: number, y2: number) {
    this.bulletTrails.push({ x1, y1, x2, y2, time: performance.now() });
  }

  setLocalPosition(x: number, y: number, angle?: number) {
    this.localState.x = x;
    this.localState.y = y;
    this.localState.vx = 0;
    this.localState.vy = 0;
    if (angle !== undefined) this.localState.angle = angle;
  }

  setFogOfWar(enabled: boolean) {
    this.fogOfWar = enabled;
  }

  getLocalPlayerState(): { health: number; weapon: string; ammo: number; ammoReserve: number; kills: number; deaths: number; credits?: number; weapons?: [string | null, string, string]; currentSlot?: number } | null {
    const me = this.lastServerState.find((p) => p.id === this.localPlayerId);
    if (!me) return null;
    return {
      health: me.health,
      weapon: me.weapon,
      ammo: me.ammo,
      ammoReserve: me.ammoReserve,
      kills: me.kills,
      deaths: me.deaths,
      credits: me.credits,
      weapons: me.weapons,
      currentSlot: me.currentSlot,
    };
  }

  private lastRoundInfo?: { round: number; roundTimeLeft: number };
  private lastRoundWins?: { ct: number; t: number };

  getRoundInfo(): { round: number; roundTimeLeft: number } | null {
    return this.lastRoundInfo ?? null;
  }

  setRoundInfo(round: number, roundTimeLeft: number, roundWins?: { ct: number; t: number }) {
    this.lastRoundInfo = { round, roundTimeLeft };
    if (roundWins) this.lastRoundWins = roundWins;
  }

  getScore(): { ct: number; t: number } {
    if (this.lastRoundWins) return { ...this.lastRoundWins };
    let ct = 0;
    let t = 0;
    for (const p of this.lastServerState) {
      if (p.team === 'ct') ct += p.kills;
      else t += p.kills;
    }
    return { ct, t };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.mapRenderer.setSize(rect.width, rect.height);
  }

  private tick(time: number) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    const [worldMouseX, worldMouseY] = this.mapRenderer.screenToWorld(
      this.mouseX,
      this.mouseY
    );
    const targetAngle = Math.atan2(
      worldMouseY - this.localState.y,
      worldMouseX - this.localState.x
    );

    if (this.mouseDown) this.onShoot?.();

    if (!this.networked) {
      this.localState = updateLocalPlayer(
        this.localState,
        this.input,
        this.map,
        dt
      );
      this.localState.angle = targetAngle;
    } else {
      const me = this.lastServerState.find((p) => p.id === this.localPlayerId);
      if (me) {
        this.localState.x = me.x;
        this.localState.y = me.y;
        this.localState.angle = me.angle;
      }
      this.localState.angle = targetAngle;
      this.inputSendInterval += dt;
      if (this.inputSendInterval >= 0.05) {
        this.inputSendInterval = 0;
        this.onInput?.({
          x: this.localState.x,
          y: this.localState.y,
          angle: targetAngle,
          up: this.input.up,
          down: this.input.down,
          left: this.input.left,
          right: this.input.right,
        });
      }
    }

    this.cameraX += (this.localState.x - this.cameraX) * CAMERA_LERP;
    this.cameraY += (this.localState.y - this.cameraY) * CAMERA_LERP;
    this.mapRenderer.setCamera(this.cameraX, this.cameraY, this.scale);

    if (this.networked && this.onHUDUpdate) {
      const local = this.getLocalPlayerState();
      const score = this.getScore();
      const roundInfo = this.getRoundInfo();
      if (local) {
        this.onHUDUpdate({
          ...local,
          scoreCt: score.ct,
          scoreT: score.t,
          round: roundInfo?.round,
          roundTimeLeft: roundInfo?.roundTimeLeft,
        });
      }
    }

    this.render();

    if (!this.networked) {
      this.onInput?.({
        x: this.localState.x,
        y: this.localState.y,
        angle: this.localState.angle,
      });
    }

    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  private render() {
    const { ctx, map, mapRenderer, localState, players } = this;
    const px = localState.x;
    const py = localState.y;
    const scale = this.scale;

    mapRenderer.render();
    mapRenderer.renderPickups(this.pickups);

    ctx.save();
    mapRenderer.applyWorldTransform(ctx);

    if (this.fogOfWar) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath();
      ctx.rect(-1000, -1000, map.width + 2000, map.height + 2000);
      ctx.arc(px, py, FOG_RADIUS, 0, Math.PI * 2);
      ctx.fill('evenodd');

      const gradient = ctx.createRadialGradient(
        px, py, FOG_RADIUS * 0.3,
        px, py, FOG_RADIUS
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.6, 'rgba(0,0,0,0.2)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-1000, -1000, map.width + 2000, map.height + 2000);
    }

    let allPlayers: Array<Player & { isLocal?: boolean }>;

    if (this.networked) {
      const others: (Player & { isLocal?: boolean })[] = [];
      this.serverPlayers.forEach((buf, id) => {
        if (id === this.localPlayerId) return;
        const p = buf.get(80);
        if (p) {
          others.push({
            ...p,
            userId: undefined,
            ammoReserve: p.ammoReserve,
            isLocal: false,
          } as Player & { isLocal?: boolean });
        }
      });
      const me = this.lastServerState.find((p) => p.id === this.localPlayerId);
      allPlayers = [
        ...others,
        {
          id: this.localPlayerId,
          username: me?.username ?? 'You',
          team: (me?.team ?? 'ct') as 'ct' | 't',
          x: localState.x,
          y: localState.y,
          angle: localState.angle,
          health: me?.health ?? 100,
          weapon: me?.weapon ?? 'usp',
          ammo: me?.ammo ?? 0,
          ammoReserve: me?.ammoReserve ?? 0,
          isAlive: me?.isAlive ?? true,
          kills: me?.kills ?? 0,
          deaths: me?.deaths ?? 0,
          isLocal: true,
        } as Player & { isLocal?: boolean },
      ];
    } else {
      allPlayers = [
        ...players.filter((p) => p.id !== this.localPlayerId),
        {
          ...localState,
          id: this.localPlayerId,
          username: 'You',
          team: 'ct',
          x: localState.x,
          y: localState.y,
          angle: localState.angle,
          health: 100,
          weapon: 'usp',
          ammo: 0,
          ammoReserve: 0,
          isAlive: true,
          kills: 0,
          deaths: 0,
          isLocal: true,
        } as Player & { isLocal?: boolean },
      ];
    }

    // Bullet trails
    const now = performance.now();
    const TRAIL_DURATION = 120;
    this.bulletTrails = this.bulletTrails.filter((t) => now - t.time < TRAIL_DURATION);
    this.bulletTrails.forEach((trail) => {
      const age = (now - trail.time) / TRAIL_DURATION;
      const alpha = 0.5 * (1 - age);
      ctx.strokeStyle = `rgba(255, 220, 100, ${alpha})`;
      ctx.lineWidth = (1.5 - age) / scale;
      ctx.beginPath();
      ctx.moveTo(trail.x1, trail.y1);
      ctx.lineTo(trail.x2, trail.y2);
      ctx.stroke();
    });

    // Рендер персонажей
    allPlayers.forEach((p) => {
      const visible = !this.fogOfWar || this.isVisible(px, py, p.x, p.y);
      if (!visible) return;

      const isCT = p.team === 'ct';
      const R = PLAYER_RADIUS;

      // --- Тень ---
      if (p.isAlive) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(p.x + 3, p.y + 3, R * 1.05, R * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Оружие (рисуем до тела, чтоб ствол шёл из-за спины) ---
      const wep = WEAPON_VISUALS[p.weapon] ?? WEAPON_VISUALS['usp'];
      const wepOffsetAngle = 0.15; // чуть правее центра
      const wepAngle = p.angle + wepOffsetAngle;
      const wepStartX = p.x + Math.cos(wepAngle) * R * 0.5;
      const wepStartY = p.y + Math.sin(wepAngle) * R * 0.5;
      const wepEndX = p.x + Math.cos(p.angle) * (R + wep.len);
      const wepEndY = p.y + Math.sin(p.angle) * (R + wep.len);

      if (p.isAlive) {
        ctx.strokeStyle = wep.color;
        ctx.lineWidth = wep.width / scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(wepStartX, wepStartY);
        ctx.lineTo(wepEndX, wepEndY);
        ctx.stroke();
        ctx.lineCap = 'butt';

        // Дульный срез
        if (p.weapon) {
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.arc(wepEndX, wepEndY, 1.5 / scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Тело ---
      const bodyColor = !p.isAlive
        ? '#3a3a3a'
        : isCT
          ? '#3b7dd8' // синий CT
          : '#d04040'; // красный T
      const bodyColorDark = !p.isAlive
        ? '#2a2a2a'
        : isCT
          ? '#2b5da8'
          : '#a03030';

      // Внешний контур (outline)
      ctx.fillStyle = bodyColorDark;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R + 1.5 / scale, 0, Math.PI * 2);
      ctx.fill();

      // Основное тело
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      ctx.fill();

      // Блик (объём)
      if (p.isAlive) {
        const grad = ctx.createRadialGradient(
          p.x - R * 0.3, p.y - R * 0.3, R * 0.1,
          p.x, p.y, R
        );
        grad.addColorStop(0, 'rgba(255,255,255,0.25)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
        ctx.fill();
      }

      // Местный игрок — белая обводка
      if (p.isLocal && p.isAlive) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5 / scale;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R + 0.5 / scale, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- Направление взгляда (визир) ---
      if (p.isAlive) {
        const visorLen = R * 0.7;
        const visorX = p.x + Math.cos(p.angle) * (R * 0.5);
        const visorY = p.y + Math.sin(p.angle) * (R * 0.5);
        const visorEndX = visorX + Math.cos(p.angle) * visorLen;
        const visorEndY = visorY + Math.sin(p.angle) * visorLen;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.moveTo(visorX, visorY);
        ctx.lineTo(visorEndX, visorEndY);
        ctx.stroke();
      }

      // --- HP bar (над персонажем) ---
      if (p.isAlive && p.health < 100) {
        const barW = R * 2.2;
        const barH = 3;
        const barX = p.x - barW / 2;
        const barY = p.y - R - 10;
        // Фон
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        // HP
        const hpPct = Math.max(0, p.health / 100);
        const hpColor = hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpPct, barH);
      }

      // --- Имя (над HP) ---
      if (p.isAlive) {
        ctx.fillStyle = isCT ? 'rgba(120,180,255,0.85)' : 'rgba(255,130,130,0.85)';
        ctx.font = `bold ${9}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(p.username, p.x, p.y - R - 12);
      }

      // Мёртвый — крестик
      if (!p.isAlive) {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2 / scale;
        const cr = R * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x - cr, p.y - cr);
        ctx.lineTo(p.x + cr, p.y + cr);
        ctx.moveTo(p.x + cr, p.y - cr);
        ctx.lineTo(p.x - cr, p.y + cr);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  private isVisible(vx: number, vy: number, px: number, py: number): boolean {
    const dx = px - vx;
    const dy = py - vy;
    return dx * dx + dy * dy <= FOG_RADIUS * FOG_RADIUS;
  }

  start() {
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  stop() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.cleanupInput?.();
  }
}
