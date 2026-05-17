import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs/promises';
import {
  type MapConfig,
  type GameInput,
  type PlayerPhysicsState as GamePlayerState,
  WEAPONS,
  START_WEAPONS,
  CREDITS_START,
  CREDITS_KILL,
  CREDITS_ROUND_WIN,
  CREDITS_ROUND_LOSS,
  AMMO_PRICE,
  computeBotAction,
  getBotName,
  updatePlayerPhysics as updatePlayer,
  PLAYER_RADIUS,
  raycast,
  getWallDist,
  MAX_SHOT_RANGE,
  createPickups,
  processPickups,
  getActivePickups,
  relocatePickups,
  PICKUP_RELOCATE_MS,
  type PickupItem,
} from 'shootout-shared';
import { mapsDir } from '../config/paths';
import { RoomStore } from './RoomStore';

const TICK_RATE = 20;
const TICK_MS = 1000 / TICK_RATE;
const ROUND_TIME_MS = 180 * 1000; // 3 min
const ROUND_END_DELAY_MS = 5000; // 5 sec before next round
const ROUND_BUY_TIME_MS = 7000; // 7 sec buy phase at round start

export interface GamePlayer {
  socketId: string;
  userId?: string;
  username: string;
  team: 'ct' | 't';
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  health: number;
  armor: number;
  weapon: string;
  ammo: number;
  ammoReserve: number;
  isAlive: boolean;
  kills: number;
  deaths: number;
  credits: number;
  weapons: [string | null, string]; // slot0 primary, slot1 pistol
  currentSlot: 0 | 1;
  weaponAmmo: Record<string, { ammo: number; reserve: number }>;
  lastInput: GameInput;
  lastShotTime: number;
  reloadEndTime: number;
}

export interface GameUpdatePayload {
  players: Array<{
    id: string;
    x: number;
    y: number;
    angle: number;
    team: 'ct' | 't';
    username: string;
    health: number;
    armor?: number;
    weapon: string;
    ammo: number;
    ammoReserve: number;
    isAlive: boolean;
    kills: number;
    deaths: number;
    credits: number;
    weapons: [string | null, string];
    currentSlot: number;
    reloadEndTime?: number;
  }>;
  pickups: Array<{ id: string; type: string; x: number; y: number }>;
  round: number;
  roundTimeLeft: number;
  roundWins: { ct: number; t: number };
  roundPhase: 'buy' | 'playing' | 'ended';
  tick: number;
}

class GameSession {
  private io: Server;
  private roomId: string;
  private map: MapConfig;
  private players = new Map<string, GamePlayer>();
  private pickups: PickupItem[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private lastTickTime = 0;
  private roundsToWin: number;
  private round = 1;
  private roundStartTime = 0;
  private roundWins = { ct: 0, t: 0 };
  private roundPhase: 'buy' | 'playing' | 'ended' = 'buy';
  private roundEndAt = 0;
  private roundBuyEndAt = 0;
  private lastPickupRelocateInterval = -1;
  private lastRoundWinner: 'ct' | 't' | null = null;

  private botDifficulties = new Map<string, 'easy' | 'medium' | 'hard'>();

  constructor(io: Server, roomId: string, map: MapConfig, roundsToWin: number) {
    this.io = io;
    this.roomId = roomId;
    this.map = map;
    this.roundsToWin = roundsToWin;
  }

  start() {
    const room = RoomStore.get(this.roomId);
    if (!room) return;

    const spawns = { ct: [...this.map.spawnPoints.ct], t: [...this.map.spawnPoints.t] };
    const teamIndices = { ct: 0, t: 0 };
    let botIndex = 0;

    for (const slot of room.slots) {
      const points = slot.team === 'ct' ? spawns.ct : spawns.t;
      const idx = teamIndices[slot.team]++;
      const sp = points[idx % points.length] || { x: 100, y: 100 };
      const pistol = START_WEAPONS[slot.team];
      const pistolDef = WEAPONS[pistol];

      if (slot.player) {
        this.players.set(slot.player.socketId, {
          socketId: slot.player.socketId,
          userId: slot.player.userId,
          username: slot.player.username,
          team: slot.team,
          x: sp.x + 30,
          y: sp.y + 30,
          angle: 0,
          vx: 0,
          vy: 0,
          health: 100,
          armor: 0,
          weapon: pistol,
          ammo: pistolDef.magazineSize,
          ammoReserve: pistolDef.id === 'pm' ? 24 : 90,
          isAlive: true,
          kills: 0,
          deaths: 0,
          credits: CREDITS_START,
          weapons: [null, pistol],
          currentSlot: 1,
          weaponAmmo: {},
          lastInput: { up: false, down: false, left: false, right: false },
          lastShotTime: 0,
          reloadEndTime: 0,
        });
      } else if (slot.bot) {
        const botId = `bot-${botIndex++}`;
        this.botDifficulties.set(botId, slot.bot.difficulty);
        this.players.set(botId, {
          socketId: botId,
          userId: undefined,
          username: getBotName(botIndex - 1),
          team: slot.team,
          x: sp.x + 30,
          y: sp.y + 30,
          angle: 0,
          vx: 0,
          vy: 0,
          health: 100,
          armor: 0,
          weapon: pistol,
          ammo: pistolDef.magazineSize,
          ammoReserve: pistolDef.id === 'pm' ? 24 : 90,
          isAlive: true,
          kills: 0,
          deaths: 0,
          credits: CREDITS_START,
          weapons: [null, pistol],
          currentSlot: 1,
          weaponAmmo: {},
          lastInput: { up: false, down: false, left: false, right: false },
          lastShotTime: 0,
          reloadEndTime: 0,
        });
      }
    }

    this.pickups = createPickups(this.map, { ammo: 3, medkit: 3, armor: 3 });
    const now = Date.now();
    this.roundStartTime = now;
    this.roundPhase = 'buy';
    this.roundBuyEndAt = now + ROUND_BUY_TIME_MS;
    this.lastPickupRelocateInterval = Math.floor(now / PICKUP_RELOCATE_MS);
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
  }

  private respawnAll() {
    const spawns = { ct: [...this.map.spawnPoints.ct], t: [...this.map.spawnPoints.t] };
    let ctIdx = 0;
    let tIdx = 0;
    for (const p of this.players.values()) {
      const points = p.team === 'ct' ? spawns.ct : spawns.t;
      const idx = p.team === 'ct' ? ctIdx++ : tIdx++;
      const sp = points[idx % points.length] || { x: 100, y: 100 };
      p.x = sp.x + 30;
      p.y = sp.y + 30;
      p.vx = 0;
      p.vy = 0;
      p.health = 100;
      if (p.team !== this.lastRoundWinner) {
        p.armor = 0;
      }
      p.isAlive = true;
      p.reloadEndTime = 0;
      this.applyWeaponSlot(p);
    }
    this.lastRoundWinner = null;
  }

  private applyWeaponSlot(p: GamePlayer) {
    const w = p.weapons[p.currentSlot];
    p.weapon = w ?? p.weapons[1];
    const def = WEAPONS[p.weapon];
    if (!def) return;
    const maxReserve = def.maxReserve ?? 120;
    const saved = p.weaponAmmo[p.weapon];
    if (saved) {
      p.ammo = saved.ammo;
      p.ammoReserve = Math.min(saved.reserve, maxReserve);
    } else {
      p.ammo = def.magazineSize;
      p.ammoReserve = Math.min(p.weapon === 'pm' ? 24 : 90, maxReserve);
    }
  }

  private saveWeaponAmmo(p: GamePlayer) {
    p.weaponAmmo[p.weapon] = { ammo: p.ammo, reserve: p.ammoReserve };
  }

  /** При смерти у игрока остаётся только пистолет. */
  private stripDeadPlayerToPistol(p: GamePlayer) {
    const pistol = START_WEAPONS[p.team];
    const def = WEAPONS[pistol];
    if (!def) return;
    p.weapons = [null, pistol];
    p.currentSlot = 1;
    p.weapon = pistol;
    p.weaponAmmo = { [pistol]: { ammo: def.magazineSize, reserve: pistol === 'pm' ? 24 : 90 } };
    p.ammo = def.magazineSize;
    p.ammoReserve = pistol === 'pm' ? 24 : 90;
    p.reloadEndTime = 0;
  }

  private checkRoundEnd(now: number): void {
    if (this.roundPhase === 'buy') {
      if (now >= this.roundBuyEndAt) {
        this.roundPhase = 'playing';
      }
      return;
    }
    if (this.roundPhase === 'ended') {
      if (now >= this.roundEndAt) {
        this.round++;
        this.roundPhase = 'buy';
        this.roundStartTime = now;
        this.roundBuyEndAt = now + ROUND_BUY_TIME_MS;
        this.respawnAll();
        this.io.to(this.roomId).emit('game:event', { type: 'roundStart', round: this.round });
      }
      return;
    }

    const ctAlive = Array.from(this.players.values()).filter((p) => p.team === 'ct' && p.isAlive).length;
    const tAlive = Array.from(this.players.values()).filter((p) => p.team === 't' && p.isAlive).length;
    const roundTimeLeft = Math.max(0, Math.floor((this.roundStartTime + ROUND_TIME_MS - now) / 1000));

    let winner: 'ct' | 't' | null = null;
    if (tAlive === 0 && ctAlive > 0) winner = 'ct';
    else if (ctAlive === 0 && tAlive > 0) winner = 't';
    else if (roundTimeLeft <= 0) winner = ctAlive > tAlive ? 'ct' : tAlive > ctAlive ? 't' : null;

    if (winner) {
      if (winner === 'ct') this.roundWins.ct++;
      else this.roundWins.t++;
      this.roundPhase = 'ended';
      this.roundEndAt = now + ROUND_END_DELAY_MS;
      this.lastRoundWinner = winner;
      for (const pl of this.players.values()) {
        const won = pl.team === winner;
        pl.credits += won ? CREDITS_ROUND_WIN : CREDITS_ROUND_LOSS;
      }
      this.io.to(this.roomId).emit('game:event', { type: 'roundEnd', winner, roundWins: this.roundWins });

      if (this.roundWins.ct >= this.roundsToWin || this.roundWins.t >= this.roundsToWin) {
        const finalPlayers = Array.from(this.players.values()).map((p) => ({
          id: p.socketId,
          username: p.username,
          team: p.team,
          kills: p.kills,
          deaths: p.deaths,
        }));
        this.io.to(this.roomId).emit('game:event', { type: 'gameOver', winner, players: finalPlayers });
        this.stop();
        const room = RoomStore.get(this.roomId);
        if (room) {
          room.status = 'waiting';
          this.io.to(this.roomId).emit('room:update', RoomStore.toState(room));
          this.io.emit('room:list', RoomStore.list());
        }
        stopGameSession(this.roomId);
      }
    }
  }

  setInput(socketId: string, input: GameInput) {
    const p = this.players.get(socketId);
    if (p) p.lastInput = input;
  }

  setAngle(socketId: string, angle: number) {
    const p = this.players.get(socketId);
    if (p) p.angle = angle;
  }

  shoot(socketId: string): void {
    const p = this.players.get(socketId);
    if (!p || !p.isAlive) return;
    if (this.roundPhase === 'ended') return;

    const now = Date.now();
    const def = WEAPONS[p.weapon];
    if (!def) return;

    if (p.reloadEndTime > now) return;
    if (p.ammo <= 0) {
      this.startReload(p);
      return;
    }
    if (now - p.lastShotTime < def.fireRateMs) return;

    p.lastShotTime = now;
    p.ammo--;
    p.weaponAmmo[p.weapon] = { ammo: p.ammo, reserve: p.ammoReserve };

    const spreadAngle = (Math.random() - 0.5) * def.spread * Math.PI;
    const shotAngle = p.angle + spreadAngle;

    const players: Array<{ id: string; team: 'ct' | 't'; x: number; y: number; radius: number }> = [];
    for (const op of this.players.values()) {
      if (op.isAlive) players.push({ id: op.socketId, team: op.team, x: op.x, y: op.y, radius: PLAYER_RADIUS });
    }

    const wallDist = getWallDist(p.x, p.y, shotAngle, MAX_SHOT_RANGE, this.map.walls);
    const hit = raycast(p.x, p.y, shotAngle, MAX_SHOT_RANGE, 0, this.map.walls, players, socketId);

    // Вычисляем конец трейла пули
    const trailDist = hit ? hit.dist : wallDist;
    const trailEndX = p.x + Math.cos(shotAngle) * trailDist;
    const trailEndY = p.y + Math.sin(shotAngle) * trailDist;

    this.io.to(this.roomId).emit('game:event', {
      type: 'shot',
      playerId: p.socketId,
      weapon: p.weapon,
      trail: { x1: p.x, y1: p.y, x2: trailEndX, y2: trailEndY },
    });

    if (hit) {
      const target = this.players.get(hit.hitId);
      if (target && target.team !== p.team) {
        const armor = target.armor ?? 0;
        const reduction = 1 - armor * 0.004; // при 100 броне — 60% урона, при 0 — 100%
        const damage = Math.max(1, Math.floor(def.damage * Math.max(0.4, reduction)));
        const armorDamage = Math.floor(damage * 0.5);
        const hitX = p.x + Math.cos(shotAngle) * hit.dist;
        const hitY = p.y + Math.sin(shotAngle) * hit.dist;
        this.io.to(this.roomId).emit('game:event', {
          type: 'hit',
          x: hitX,
          y: hitY,
          damage,
          attackerId: p.socketId,
          victimId: hit.hitId,
        });
        target.health = Math.max(0, target.health - damage);
        target.armor = Math.max(0, (target.armor ?? 0) - armorDamage);
        if (target.health <= 0) {
          target.isAlive = false;
          target.deaths++;
          this.stripDeadPlayerToPistol(target);
          p.kills++;
          p.credits += CREDITS_KILL;
          this.io.to(this.roomId).emit('game:event', {
            type: 'kill',
            killer: p.socketId,
            victim: hit.hitId,
            killerName: p.username,
            victimName: target.username,
            weapon: p.weapon,
          });
        }
      }
    }
  }

  switchWeapon(socketId: string, slot: 0 | 1): void {
    const p = this.players.get(socketId);
    if (!p || !p.isAlive) return;
    const w = p.weapons[slot];
    if (!w && slot === 0) return;
    if (slot === p.currentSlot) return;
    this.saveWeaponAmmo(p);
    p.currentSlot = slot;
    this.applyWeaponSlot(p);
  }

  buyWeapon(socketId: string, weaponId: string): void {
    if (weaponId === 'ammo') {
      this.buyAmmo(socketId);
      return;
    }
    const p = this.players.get(socketId);
    if (!p || !p.isAlive) return;
    if (this.roundPhase !== 'buy') return; // покупка только в время закупа в начале раунда

    const def = WEAPONS[weaponId];
    if (!def || !def.price) return;
    if (p.credits < def.price) return;
    const buyablePrimary = ['ak47', 'm4'];
    if (buyablePrimary.includes(weaponId)) {
      p.credits -= def.price;
      p.weapons[0] = weaponId;
      p.weaponAmmo[weaponId] = { ammo: def.magazineSize, reserve: 0 };
      this.saveWeaponAmmo(p);
      p.currentSlot = 0;
      this.applyWeaponSlot(p);
    }
  }

  buyAmmo(socketId: string): void {
    const p = this.players.get(socketId);
    if (!p || !p.isAlive) return;
    if (this.roundPhase !== 'buy') return;
    if (p.credits < AMMO_PRICE) return;
    const def = WEAPONS[p.weapon];
    if (!def || def.maxReserve == null) return;
    const add = def.magazineSize;
    const newReserve = Math.min(p.ammoReserve + add, def.maxReserve);
    if (newReserve <= p.ammoReserve) return; // уже полный запас
    p.credits -= AMMO_PRICE;
    p.ammoReserve = newReserve;
    p.weaponAmmo[p.weapon] = { ammo: p.ammo, reserve: p.ammoReserve };
  }

  reload(socketId: string): void {
    const p = this.players.get(socketId);
    if (!p || !p.isAlive || p.ammoReserve <= 0) return;
    if (this.roundPhase === 'ended') return;
    const def = WEAPONS[p.weapon];
    if (!def || p.ammo >= def.magazineSize) return;
    if (Date.now() < p.reloadEndTime) return;
    this.startReload(p);
  }

  private startReload(p: GamePlayer) {
    const def = WEAPONS[p.weapon];
    if (!def || def.reloadTimeMs <= 0) return;
    p.reloadEndTime = Date.now() + def.reloadTimeMs;
    this.io.to(this.roomId).emit('game:event', { type: 'reloadStart', playerId: p.socketId });
  }

  private processReloads() {
    const now = Date.now();
    for (const p of this.players.values()) {
      if (p.reloadEndTime > 0 && now >= p.reloadEndTime) {
        const def = WEAPONS[p.weapon];
        if (def) {
          const need = def.magazineSize - p.ammo;
          const take = Math.min(need, p.ammoReserve);
          p.ammo += take;
          p.ammoReserve -= take;
          p.weaponAmmo[p.weapon] = { ammo: p.ammo, reserve: p.ammoReserve };
        }
        p.reloadEndTime = 0;
      }
    }
  }

  private tick() {
    const dt = 1 / TICK_RATE;
    const now = Date.now();
    this.lastTickTime = now;

    this.checkRoundEnd(now);

    const activePickups = getActivePickups(this.pickups, now);
    for (const p of this.players.values()) {
      if (p.socketId.startsWith('bot-') && p.isAlive) {
        const playersList = Array.from(this.players.values()).map((op) => ({
          id: op.socketId,
          team: op.team,
          x: op.x,
          y: op.y,
          isAlive: op.isAlive,
        }));
        const mapContext = {
          mapWidth: this.map.width,
          mapHeight: this.map.height,
          enemySpawnPoints: (p.team === 'ct' ? this.map.spawnPoints.t : this.map.spawnPoints.ct).map((s) => ({
            x: s.x + 15,
            y: s.y + 15,
          })),
          pickups: activePickups.map((pu) => ({ x: pu.x, y: pu.y, type: pu.type })),
        };
        const action = computeBotAction(
          p.socketId,
          p.team,
          p.x,
          p.y,
          p.angle,
          playersList,
          this.map.walls,
          this.tickCount,
          this.botDifficulties.get(p.socketId) ?? 'medium',
          mapContext,
          p.ammo,
          p.ammoReserve,
          p.health,
          p.armor,
          MAX_SHOT_RANGE
        );
        p.lastInput = action.input;
        p.angle = action.angle;
        if (action.wantReload) this.reload(p.socketId);
        if (action.shoot) this.shoot(p.socketId);
      }
    }

    this.processReloads();
    const taken = processPickups(
      this.pickups,
      Array.from(this.players.values()),
      (w) => WEAPONS[w]?.magazineSize ?? 30,
      now,
      (w) => WEAPONS[w]?.maxReserve
    );
    for (const t of taken) {
      const eventType = t.type === 'ammo' ? 'pickupAmmo' : t.type === 'medkit' ? 'pickupMedkit' : 'pickupArmor';
      this.io.to(this.roomId).emit('game:event', { type: eventType, playerId: t.playerId });
    }

    const relocateInterval = Math.floor(now / PICKUP_RELOCATE_MS);
    if (relocateInterval !== this.lastPickupRelocateInterval) {
      this.lastPickupRelocateInterval = relocateInterval;
      relocatePickups(this.pickups, this.map, now);
    }

    const freezeInput: GameInput = { up: false, down: false, left: false, right: false };
    for (const p of this.players.values()) {
      if (!p.isAlive) continue;

      const state: GamePlayerState = {
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        angle: p.angle,
      };
      const input = this.roundPhase === 'ended' ? freezeInput : p.lastInput;
      const next = updatePlayer(state, input, this.map, dt);
      p.x = next.x;
      p.y = next.y;
      p.vx = next.vx;
      p.vy = next.vy;
    }

    this.tickCount++;
    this.broadcast();
  }

  private broadcast() {
    const now = Date.now();
    const roundTimeLeft = this.roundPhase === 'buy'
      ? Math.max(0, Math.floor((this.roundBuyEndAt - now) / 1000))
      : this.roundPhase === 'playing'
        ? Math.max(0, Math.floor((this.roundStartTime + ROUND_TIME_MS - now) / 1000))
        : Math.max(0, Math.floor((this.roundEndAt - now) / 1000));
    const payload: GameUpdatePayload = {
      players: Array.from(this.players.values()).map((p) => ({
        id: p.socketId,
        x: p.x,
        y: p.y,
        angle: p.angle,
        team: p.team,
        username: p.username,
        health: p.health,
        armor: p.armor,
        weapon: p.weapon,
        ammo: p.ammo,
        ammoReserve: p.ammoReserve,
        isAlive: p.isAlive,
        kills: p.kills,
        deaths: p.deaths,
        credits: p.credits,
        weapons: p.weapons,
        currentSlot: p.currentSlot,
        reloadEndTime: p.reloadEndTime > now ? p.reloadEndTime : undefined,
      })),
      pickups: getActivePickups(this.pickups, now),
      round: this.round,
      roundTimeLeft,
      roundWins: { ...this.roundWins },
      roundPhase: this.roundPhase,
      tick: this.tickCount,
    };
    this.io.to(this.roomId).emit('game:update', payload);
  }

  getState(): { map: MapConfig; players: GameUpdatePayload['players']; pickups: GameUpdatePayload['pickups']; round: number; roundTimeLeft: number; roundWins: { ct: number; t: number }; roundPhase: string } {
    const now = Date.now();
    const roundTimeLeft = this.roundPhase === 'buy'
      ? Math.max(0, Math.floor((this.roundBuyEndAt - now) / 1000))
      : this.roundPhase === 'playing'
        ? Math.max(0, Math.floor((this.roundStartTime + ROUND_TIME_MS - now) / 1000))
        : Math.max(0, Math.floor((this.roundEndAt - now) / 1000));
    return {
      map: this.map,
      players: Array.from(this.players.values()).map((p) => ({
        id: p.socketId,
        x: p.x,
        y: p.y,
        angle: p.angle,
        team: p.team,
        username: p.username,
        health: p.health,
        armor: p.armor,
        weapon: p.weapon,
        ammo: p.ammo,
        ammoReserve: p.ammoReserve,
        isAlive: p.isAlive,
        kills: p.kills,
        deaths: p.deaths,
        credits: p.credits,
        weapons: p.weapons,
        currentSlot: p.currentSlot,
        reloadEndTime: p.reloadEndTime > now ? p.reloadEndTime : undefined,
      })),
      pickups: getActivePickups(this.pickups, now),
      round: this.round,
      roundTimeLeft,
      roundWins: { ...this.roundWins },
      roundPhase: this.roundPhase,
    };
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  removePlayer(socketId: string) {
    if (!socketId.startsWith('bot-')) this.players.delete(socketId);
  }

  forfeitDueToPlayerLeave(leaverSocketId: string): boolean {
    const room = RoomStore.get(this.roomId);
    if (!room || room.status !== 'playing') return false;

    const inSession = this.players.get(leaverSocketId);
    let leaverTeam: 'ct' | 't' | undefined = inSession?.team;
    if (!leaverTeam) {
      const slot = room.slots.find((s) => s.player?.socketId === leaverSocketId);
      leaverTeam = slot?.team;
    }
    if (!leaverTeam) return false;

    const winner: 'ct' | 't' = leaverTeam === 'ct' ? 't' : 'ct';
    const finalPlayers = Array.from(this.players.values()).map((p) => ({
      id: p.socketId,
      username: p.username,
      team: p.team,
      kills: p.kills,
      deaths: p.deaths,
    }));

    this.removePlayer(leaverSocketId);
    this.stop();
    room.status = 'waiting';
    for (const slot of room.slots) {
      if (slot.player) slot.player.isReady = false;
    }

    this.io.to(this.roomId).emit('game:event', {
      type: 'gameOver',
      winner,
      players: finalPlayers,
      reason: 'opponentLeft',
    });
    this.io.to(this.roomId).emit('room:update', RoomStore.toState(room));
    this.io.emit('room:list', RoomStore.list());
    sessions.delete(this.roomId);
    return true;
  }
}

const sessions = new Map<string, GameSession>();

export async function startGameSession(io: Server, roomId: string, mapId: string): Promise<GameSession | null> {
  try {
    const room = RoomStore.get(roomId);
    if (!room) return null;

    const filePath = path.join(mapsDir, `${mapId.replace(/[^a-z0-9-]/gi, '')}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    const map = JSON.parse(data);

    const session = new GameSession(io, roomId, map, room.roundsToWin);
    sessions.set(roomId, session);
    session.start();
    return session;
  } catch (err) {
    console.error('Failed to start game session:', err);
    return null;
  }
}

export function getGameSession(roomId: string): GameSession | undefined {
  return sessions.get(roomId);
}

export function stopGameSession(roomId: string) {
  const session = sessions.get(roomId);
  if (session) {
    session.stop();
    sessions.delete(roomId);
  }
}

export function forfeitMatch(roomId: string, leaverSocketId: string): void {
  const session = sessions.get(roomId);
  if (!session) return;
  session.forfeitDueToPlayerLeave(leaverSocketId);
}
