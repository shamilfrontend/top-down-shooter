import type { MapConfig } from 'top-down-cs-shared';
import { updateLocalPlayer, type InputState, type LocalPlayerState } from './Physics';
import { WEAPONS, START_WEAPONS, CREDITS_START, CREDITS_KILL, CREDITS_ROUND_WIN, CREDITS_ROUND_LOSS } from './local/weapons';
import { raycast, getWallDist } from './local/raycast';
import { createPickups, processPickups, getActivePickups, relocatePickups, PICKUP_RELOCATE_MS, type PickupItem } from './local/localPickups';
import { computeBotAction, getBotName } from './local/LocalBotAI';

const TICK_RATE = 20;
const TICK_MS = 1000 / TICK_RATE;
const PLAYER_RADIUS = 23;
const ROUND_TIME_MS = 180 * 1000;
const ROUND_END_DELAY_MS = 5000;
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface LocalGameSessionOptions {
  ctBotCount?: number;
  tBotCount?: number;
  botDifficulty?: BotDifficulty;
  /** За какую команду играет локальный игрок (по умолчанию ct). */
  localPlayerTeam?: 'ct' | 't';
  /** До скольки побед играть (матч завершается). Не задано — бесконечные раунды. */
  roundsToWin?: number;
}

/** По умолчанию: 0 CT (без союзников) + 10 T = 10 ботов */
const DEFAULT_CT_BOTS = 0;
const DEFAULT_T_BOTS = 10;

export interface LocalPlayer {
  id: string;
  team: 'ct' | 't';
  username: string;
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
  weapons: [string | null, string];
  currentSlot: 0 | 1;
  weaponAmmo: Record<string, { ammo: number; reserve: number }>;
  lastInput: InputState;
  lastShotTime: number;
  reloadEndTime: number;
}

export interface LocalGameState {
  players: Array<{
    id: string;
    x: number;
    y: number;
    angle: number;
    team: 'ct' | 't';
    username: string;
    health: number;
    armor: number;
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
  roundPhase: 'playing' | 'ended';
}

export class LocalGameSession {
  private map: MapConfig;
  private options: LocalGameSessionOptions;
  private players = new Map<string, LocalPlayer>();
  private pickups: PickupItem[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private round = 1;
  private roundStartTime = 0;
  private roundWins = { ct: 0, t: 0 };
  private roundPhase: 'playing' | 'ended' = 'playing';
  private roundEndAt = 0;
  private lastPickupRelocateInterval = -1;
  private onState?: (state: LocalGameState) => void;
  private onShotTrail?: (x1: number, y1: number, x2: number, y2: number) => void;
  private onShot?: (weapon: string) => void;
  private onRoundEnd?: (winner: 'ct' | 't') => void;
  private onRoundStart?: () => void;
  private onPickup?: (type: 'ammo' | 'medkit' | 'armor') => void;
  private onKill?: (killerName: string, victimName: string) => void;
  private onHit?: (x: number, y: number, damage: number) => void;
  private onGameOver?: (winner: 'ct' | 't', players: Array<{ id: string; username: string; team: string; kills: number; deaths: number }>) => void;
  private onReloadStart?: () => void;

  constructor(map: MapConfig, options?: LocalGameSessionOptions) {
    this.map = map;
    this.options = options ?? {};
  }

  start() {
    const spawns = { ct: [...this.map.spawnPoints.ct], t: [...this.map.spawnPoints.t] };
    let ctIdx = 0;
    let tIdx = 0;

    const localTeam = this.options.localPlayerTeam ?? 'ct';
    const pistol = START_WEAPONS[localTeam];
    const pistolDef = WEAPONS[pistol];
    const sp = (spawns[localTeam][0] || { x: 100, y: 100 }) as { x: number; y: number };

    this.players.set('local', {
      id: 'local',
      team: localTeam,
      username: 'You',
      x: sp.x + 30,
      y: sp.y + 30,
      angle: 0,
      vx: 0,
      vy: 0,
      health: 100,
      armor: 0,
      weapon: pistol,
      ammo: pistolDef.magazineSize,
      ammoReserve: 24,
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

    const ctBotCount = this.options.ctBotCount ?? DEFAULT_CT_BOTS;
    const tBotCount = this.options.tBotCount ?? DEFAULT_T_BOTS;
    let botIndex = 0;

    for (let i = 0; i < ctBotCount; i++) {
      const points = spawns.ct;
      const idx = ctIdx++;
      const spBot = points[idx % points.length] || { x: 100, y: 100 };
      const botId = `bot-${botIndex++}`;
      const pDef = WEAPONS[pistol];
      this.players.set(botId, {
        id: botId,
        team: 'ct',
        username: getBotName(botIndex - 1),
        x: spBot.x + 30,
        y: spBot.y + 30,
        angle: 0,
        vx: 0,
        vy: 0,
        health: 100,
        armor: 0,
        weapon: pistol,
        ammo: pDef.magazineSize,
        ammoReserve: 24,
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

    for (let i = 0; i < tBotCount; i++) {
      const points = spawns.t;
      const idx = tIdx++;
      const spBot = points[idx % points.length] || { x: 100, y: 100 };
      const botId = `bot-${botIndex++}`;
      const pDef = WEAPONS[pistol];
      this.players.set(botId, {
        id: botId,
        team: 't',
        username: getBotName(botIndex - 1),
        x: spBot.x + 30,
        y: spBot.y + 30,
        angle: 0,
        vx: 0,
        vy: 0,
        health: 100,
        armor: 0,
        weapon: pistol,
        ammo: pDef.magazineSize,
        ammoReserve: 24,
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

    this.pickups = createPickups(this.map, { ammo: 3, medkit: 3, armor: 3 });
    this.roundStartTime = Date.now();
    this.lastPickupRelocateInterval = Math.floor(Date.now() / PICKUP_RELOCATE_MS);
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
    this.onRoundStart?.();
  }

  setOnState(cb: (state: LocalGameState) => void) {
    this.onState = cb;
  }

  setOnShotTrail(cb: (x1: number, y1: number, x2: number, y2: number) => void) {
    this.onShotTrail = cb;
  }

  setOnShot(cb: (weapon: string) => void) {
    this.onShot = cb;
  }

  setOnRoundEnd(cb: (winner: 'ct' | 't') => void) {
    this.onRoundEnd = cb;
  }

  setOnRoundStart(cb: () => void) {
    this.onRoundStart = cb;
  }

  setOnPickup(cb: (type: 'ammo' | 'medkit' | 'armor') => void) {
    this.onPickup = cb;
  }

  setOnKill(cb: (killerName: string, victimName: string) => void) {
    this.onKill = cb;
  }

  setOnHit(cb: (x: number, y: number, damage: number) => void) {
    this.onHit = cb;
  }

  setOnGameOver(cb: (winner: 'ct' | 't', players: Array<{ id: string; username: string; team: string; kills: number; deaths: number }>) => void) {
    this.onGameOver = cb;
  }

  setOnReloadStart(cb: () => void) {
    this.onReloadStart = cb;
  }

  setInput(id: string, input: InputState) {
    const p = this.players.get(id);
    if (p) p.lastInput = input;
  }

  setAngle(id: string, angle: number) {
    const p = this.players.get(id);
    if (p) p.angle = angle;
  }

  shoot(id: string): void {
    const p = this.players.get(id);
    if (!p || !p.isAlive) return;
    if (this.roundPhase === 'ended') return;

    const now = Date.now();
    const def = WEAPONS[p.weapon];
    if (!def) return;

    if (p.reloadEndTime > now) return;
    if (p.ammo <= 0) {
      if (p.ammoReserve > 0) {
        this.startReload(p);
        if (id === 'local') this.onReloadStart?.();
      }
      return;
    }
    if (now - p.lastShotTime < def.fireRateMs) return;

    p.lastShotTime = now;
    p.ammo--;
    p.weaponAmmo[p.weapon] = { ammo: p.ammo, reserve: p.ammoReserve };

    const spreadAngle = (Math.random() - 0.5) * def.spread * Math.PI;
    const shotAngle = p.angle + spreadAngle;

    const players = Array.from(this.players.values())
      .filter((op) => op.isAlive)
      .map((op) => ({ id: op.id, team: op.team, x: op.x, y: op.y, radius: PLAYER_RADIUS }));

    const hit = raycast(p.x, p.y, shotAngle, def.range, 0, this.map.walls, players, id);

    const wallDist = getWallDist(p.x, p.y, shotAngle, def.range, this.map.walls);
    const trailDist = hit ? Math.min(hit.dist, wallDist) : wallDist;
    const trailEndX = p.x + Math.cos(shotAngle) * trailDist;
    const trailEndY = p.y + Math.sin(shotAngle) * trailDist;
    this.onShotTrail?.(p.x, p.y, trailEndX, trailEndY);
    this.onShot?.(p.weapon);

    if (hit) {
      const target = this.players.get(hit.hitId);
      if (target && target.team !== p.team) {
        const armor = target.armor ?? 0;
        const reduction = 1 - armor * 0.004;
        const damage = Math.max(1, Math.floor(def.damage * Math.max(0.4, reduction)));
        const armorDamage = Math.floor(damage * 0.5);
        const hitX = p.x + Math.cos(shotAngle) * hit.dist;
        const hitY = p.y + Math.sin(shotAngle) * hit.dist;
        this.onHit?.(hitX, hitY, damage);
        target.health = Math.max(0, target.health - damage);
        target.armor = Math.max(0, (target.armor ?? 0) - armorDamage);
        if (target.health <= 0) {
          target.isAlive = false;
          target.deaths++;
          this.stripDeadPlayerToPistol(target);
          p.kills++;
          p.credits += CREDITS_KILL;
          this.onKill?.(p.username, target.username);
        }
      }
    }
  }

  /** Возвращает true, если перезарядка реально началась. */
  reload(id: string): boolean {
    const p = this.players.get(id);
    if (!p || !p.isAlive || p.ammoReserve <= 0) return false;
    if (this.roundPhase === 'ended') return false;
    const def = WEAPONS[p.weapon];
    if (!def || p.ammo >= def.magazineSize) return false;
    if (Date.now() < p.reloadEndTime) return false;
    this.startReload(p);
    if (id === 'local') this.onReloadStart?.();
    return true;
  }

  /** При смерти у игрока остаётся только пистолет. */
  private stripDeadPlayerToPistol(p: LocalPlayer) {
    const pistol = START_WEAPONS[p.team];
    const def = WEAPONS[pistol];
    if (!def) return;
    p.weapons = [null, pistol];
    p.currentSlot = 1;
    p.weapon = pistol;
    p.weaponAmmo = { [pistol]: { ammo: def.magazineSize, reserve: pistol === 'usp' ? 24 : 90 } };
    p.ammo = def.magazineSize;
    p.ammoReserve = pistol === 'usp' ? 24 : 90;
    p.reloadEndTime = 0;
  }

  private startReload(p: LocalPlayer) {
    const def = WEAPONS[p.weapon];
    if (!def || def.reloadTimeMs <= 0) return;
    p.reloadEndTime = Date.now() + def.reloadTimeMs;
  }

  switchWeapon(id: string, slot: 0 | 1): void {
    const p = this.players.get(id);
    if (!p || !p.isAlive) return;
    const w = p.weapons[slot];
    if (!w && slot === 0) return;
    if (slot === p.currentSlot) return;
    p.weaponAmmo[p.weapon] = { ammo: p.ammo, reserve: p.ammoReserve };
    p.currentSlot = slot;
    this.applyWeaponSlot(p);
  }

  private static readonly ARMOR_PRICE = 650;
  private static readonly ARMOR_BUY_AMOUNT = 50;
  private static readonly ARMOR_MAX = 100;

  buyWeapon(id: string, weaponId: string): void {
    const p = this.players.get(id);
    if (!p || !p.isAlive) return;
    if (this.roundPhase !== 'ended') return; // покупка только в время закупа

    if (weaponId === 'armor') {
      const cur = p.armor;
      if (cur >= LocalGameSession.ARMOR_MAX || p.credits < LocalGameSession.ARMOR_PRICE) return;
      p.credits -= LocalGameSession.ARMOR_PRICE;
      p.armor = Math.min(LocalGameSession.ARMOR_MAX, cur + LocalGameSession.ARMOR_BUY_AMOUNT);
      return;
    }

    const def = WEAPONS[weaponId];
    if (!def || !def.price) return;
    if (p.credits < def.price) return;
    const buyablePrimary = ['ak47', 'm4', 'awp'];
    if (buyablePrimary.includes(weaponId)) {
      p.credits -= def.price;
      p.weapons[0] = weaponId;
      p.weaponAmmo[weaponId] = { ammo: def.magazineSize, reserve: 0 };
      p.weaponAmmo[p.weapon] = { ammo: p.ammo, reserve: p.ammoReserve };
      p.currentSlot = 0;
      this.applyWeaponSlot(p);
    }
  }

  private applyWeaponSlot(p: LocalPlayer) {
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
      p.ammoReserve = Math.min(p.weapon === 'usp' ? 24 : 90, maxReserve);
    }
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
      p.armor = 0;
      p.isAlive = true;
      p.reloadEndTime = 0;
      this.applyWeaponSlot(p);
    }
  }

  private checkRoundEnd(now: number): void {
    if (this.roundPhase === 'ended') {
      if (now >= this.roundEndAt) {
        this.round++;
        this.roundPhase = 'playing';
        this.roundStartTime = now;
        this.onRoundStart?.();
        this.respawnAll();
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
      this.onRoundEnd?.(winner);
      for (const pl of this.players.values()) {
        pl.credits += pl.team === winner ? CREDITS_ROUND_WIN : CREDITS_ROUND_LOSS;
      }
      const roundsToWin = this.options.roundsToWin;
      if (roundsToWin != null && (this.roundWins.ct >= roundsToWin || this.roundWins.t >= roundsToWin)) {
        const finalPlayers = Array.from(this.players.values()).map((p) => ({
          id: p.id,
          username: p.username,
          team: p.team,
          kills: p.kills,
          deaths: p.deaths,
        }));
        this.onGameOver?.(winner, finalPlayers);
        this.stop();
      }
    }
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

    this.checkRoundEnd(now);

    for (const p of this.players.values()) {
      if (p.id.startsWith('bot-') && p.isAlive) {
        const playersList = Array.from(this.players.values()).map((op) => ({
          id: op.id,
          team: op.team,
          x: op.x,
          y: op.y,
          isAlive: op.isAlive,
        }));
        const difficulty = this.options.botDifficulty ?? 'medium';
        const mapContext = {
          mapWidth: this.map.width,
          mapHeight: this.map.height,
          enemySpawnPoints: (p.team === 'ct' ? this.map.spawnPoints.t : this.map.spawnPoints.ct).map((s) => ({ x: s.x + 15, y: s.y + 15 })),
          pickups: getActivePickups(this.pickups, now).map((pu) => ({ x: pu.x, y: pu.y, type: pu.type })),
        };
        const weaponRange = WEAPONS[p.weapon]?.range ?? 420;
        const action = computeBotAction(p.id, p.team, p.x, p.y, p.angle, playersList, this.map.walls, this.tickCount, difficulty, mapContext, p.ammo, p.ammoReserve, p.health, p.armor ?? 0, weaponRange);
        p.lastInput = action.input;
        p.angle = action.angle;
        if (action.shoot) this.shoot(p.id);
        if (action.wantReload) this.reload(p.id);
      }
    }

    this.processReloads();
    processPickups(
      this.pickups,
      Array.from(this.players.values()),
      (w) => WEAPONS[w]?.magazineSize ?? 30,
      now,
      this.onPickup,
      (w) => WEAPONS[w]?.maxReserve
    );

    const relocateInterval = Math.floor(now / PICKUP_RELOCATE_MS);
    if (relocateInterval !== this.lastPickupRelocateInterval) {
      this.lastPickupRelocateInterval = relocateInterval;
      relocatePickups(this.pickups, this.map, now);
    }

    const freezeInput: InputState = { up: false, down: false, left: false, right: false };
    for (const p of this.players.values()) {
      if (!p.isAlive) continue;
      const state: LocalPlayerState = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, angle: p.angle };
      const input = this.roundPhase === 'ended' ? freezeInput : p.lastInput;
      const next = updateLocalPlayer(state, input, this.map, dt);
      p.x = next.x;
      p.y = next.y;
      p.vx = next.vx;
      p.vy = next.vy;
    }

    this.tickCount++;

    const roundTimeLeft = this.roundPhase === 'playing'
      ? Math.max(0, Math.floor((this.roundStartTime + ROUND_TIME_MS - now) / 1000))
      : Math.max(0, Math.floor((this.roundEndAt - now) / 1000));

    this.onState?.({
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
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
        weapons: [...p.weapons],
        currentSlot: p.currentSlot,
        reloadEndTime: p.reloadEndTime > now ? p.reloadEndTime : undefined,
      })),
      pickups: getActivePickups(this.pickups, now),
      round: this.round,
      roundTimeLeft,
      roundWins: { ...this.roundWins },
      roundPhase: this.roundPhase,
    });
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
