"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGameSession = startGameSession;
exports.getGameSession = getGameSession;
exports.stopGameSession = stopGameSession;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const RoomStore_1 = require("./RoomStore");
const ServerPhysics_1 = require("./ServerPhysics");
const Weapons_1 = require("./Weapons");
const Shooting_1 = require("./Shooting");
const Pickups_1 = require("./Pickups");
const BotAI_1 = require("./BotAI");
const TICK_RATE = 20;
const PLAYER_RADIUS = 23;
const TICK_MS = 1000 / TICK_RATE;
const ROUND_TIME_MS = 180 * 1000; // 3 min
const ROUND_END_DELAY_MS = 5000; // 5 sec before next round
const mapsDir = path_1.default.join(process.cwd(), 'data', 'maps');
class GameSession {
    constructor(io, roomId, map, roundsToWin, botsConfig) {
        this.players = new Map();
        this.pickups = [];
        this.tickInterval = null;
        this.tickCount = 0;
        this.lastTickTime = 0;
        this.round = 1;
        this.roundStartTime = 0;
        this.roundWins = { ct: 0, t: 0 };
        this.roundPhase = 'playing';
        this.roundEndAt = 0;
        this.io = io;
        this.roomId = roomId;
        this.map = map;
        this.roundsToWin = roundsToWin;
        this.botsConfig = botsConfig ?? { enabled: false, difficulty: 'medium', count: 0 };
    }
    start() {
        const room = RoomStore_1.RoomStore.get(this.roomId);
        if (!room)
            return;
        const spawns = { ct: [...this.map.spawnPoints.ct], t: [...this.map.spawnPoints.t] };
        let ctIdx = 0;
        let tIdx = 0;
        for (const lp of room.players.values()) {
            const team = lp.team;
            const points = team === 'ct' ? spawns.ct : spawns.t;
            const idx = team === 'ct' ? ctIdx++ : tIdx++;
            const sp = points[idx % points.length] || { x: 100, y: 100 };
            const pistol = Weapons_1.START_WEAPONS[team];
            const pistolDef = Weapons_1.WEAPONS[pistol];
            this.players.set(lp.socketId, {
                socketId: lp.socketId,
                userId: lp.userId,
                username: lp.username,
                team,
                x: sp.x + 30,
                y: sp.y + 30,
                angle: 0,
                vx: 0,
                vy: 0,
                health: 100,
                weapon: pistol,
                ammo: pistolDef.magazineSize,
                ammoReserve: pistolDef.id === 'usp' ? 24 : 90,
                isAlive: true,
                kills: 0,
                deaths: 0,
                credits: Weapons_1.CREDITS_START,
                weapons: [null, pistol],
                currentSlot: 1,
                weaponAmmo: {},
                lastInput: { up: false, down: false, left: false, right: false },
                lastShotTime: 0,
                reloadEndTime: 0,
            });
        }
        if (this.botsConfig.enabled && this.botsConfig.count > 0) {
            const botCount = Math.min(8, this.botsConfig.count);
            for (let i = 0; i < botCount; i++) {
                const team = i % 2 === 0 ? 'ct' : 't';
                const points = team === 'ct' ? spawns.ct : spawns.t;
                const idx = team === 'ct' ? ctIdx++ : tIdx++;
                const sp = points[idx % points.length] || { x: 100, y: 100 };
                const botId = `bot-${i}`;
                const pistol = Weapons_1.START_WEAPONS[team];
                const pistolDef = Weapons_1.WEAPONS[pistol];
                this.players.set(botId, {
                    socketId: botId,
                    userId: undefined,
                    username: (0, BotAI_1.getBotName)(i),
                    team,
                    x: sp.x + 30,
                    y: sp.y + 30,
                    angle: 0,
                    vx: 0,
                    vy: 0,
                    health: 100,
                    weapon: pistol,
                    ammo: pistolDef.magazineSize,
                    ammoReserve: pistolDef.id === 'usp' ? 24 : 90,
                    isAlive: true,
                    kills: 0,
                    deaths: 0,
                    credits: Weapons_1.CREDITS_START,
                    weapons: [null, pistol],
                    currentSlot: 1,
                    weaponAmmo: {},
                    lastInput: { up: false, down: false, left: false, right: false },
                    lastShotTime: 0,
                    reloadEndTime: 0,
                });
            }
        }
        this.pickups = (0, Pickups_1.createPickups)(this.map, { ammo: 5, medkit: 3 });
        this.roundStartTime = Date.now();
        this.tickInterval = setInterval(() => this.tick(), TICK_MS);
    }
    respawnAll() {
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
            p.isAlive = true;
            p.reloadEndTime = 0;
            this.applyWeaponSlot(p);
        }
    }
    applyWeaponSlot(p) {
        const w = p.weapons[p.currentSlot];
        p.weapon = w ?? p.weapons[1];
        const def = Weapons_1.WEAPONS[p.weapon];
        if (!def)
            return;
        const saved = p.weaponAmmo[p.weapon];
        if (saved) {
            p.ammo = saved.ammo;
            p.ammoReserve = saved.reserve;
        }
        else {
            p.ammo = def.magazineSize;
            p.ammoReserve = p.weapon === 'usp' ? 24 : 90;
        }
    }
    saveWeaponAmmo(p) {
        p.weaponAmmo[p.weapon] = { ammo: p.ammo, reserve: p.ammoReserve };
    }
    checkRoundEnd(now) {
        if (this.roundPhase === 'ended') {
            if (now >= this.roundEndAt) {
                this.round++;
                this.roundPhase = 'playing';
                this.roundStartTime = now;
                this.respawnAll();
                this.io.to(this.roomId).emit('game:event', { type: 'roundStart', round: this.round });
            }
            return;
        }
        const ctAlive = Array.from(this.players.values()).filter((p) => p.team === 'ct' && p.isAlive).length;
        const tAlive = Array.from(this.players.values()).filter((p) => p.team === 't' && p.isAlive).length;
        const roundTimeLeft = Math.max(0, Math.floor((this.roundStartTime + ROUND_TIME_MS - now) / 1000));
        let winner = null;
        if (tAlive === 0 && ctAlive > 0)
            winner = 'ct';
        else if (ctAlive === 0 && tAlive > 0)
            winner = 't';
        else if (roundTimeLeft <= 0)
            winner = ctAlive > tAlive ? 'ct' : tAlive > ctAlive ? 't' : null;
        if (winner) {
            if (winner === 'ct')
                this.roundWins.ct++;
            else
                this.roundWins.t++;
            this.roundPhase = 'ended';
            this.roundEndAt = now + ROUND_END_DELAY_MS;
            for (const pl of this.players.values()) {
                const won = pl.team === winner;
                pl.credits += won ? Weapons_1.CREDITS_ROUND_WIN : Weapons_1.CREDITS_ROUND_LOSS;
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
                stopGameSession(this.roomId);
            }
        }
    }
    setInput(socketId, input) {
        const p = this.players.get(socketId);
        if (p)
            p.lastInput = input;
    }
    setAngle(socketId, angle) {
        const p = this.players.get(socketId);
        if (p)
            p.angle = angle;
    }
    shoot(socketId) {
        const p = this.players.get(socketId);
        if (!p || !p.isAlive)
            return;
        const now = Date.now();
        const def = Weapons_1.WEAPONS[p.weapon];
        if (!def)
            return;
        if (p.reloadEndTime > now)
            return;
        if (p.ammo <= 0) {
            this.startReload(p);
            return;
        }
        if (now - p.lastShotTime < def.fireRateMs)
            return;
        p.lastShotTime = now;
        p.ammo--;
        p.weaponAmmo[p.weapon] = { ammo: p.ammo, reserve: p.ammoReserve };
        const spreadAngle = (Math.random() - 0.5) * def.spread * Math.PI;
        const shotAngle = p.angle + spreadAngle;
        const players = [];
        for (const op of this.players.values()) {
            if (op.isAlive)
                players.push({ id: op.socketId, team: op.team, x: op.x, y: op.y, radius: PLAYER_RADIUS });
        }
        const hit = (0, Shooting_1.raycast)(p.x, p.y, shotAngle, def.range, 0, this.map.walls, players, socketId);
        // Вычисляем конец трейла пули
        const trailDist = hit ? hit.dist : def.range;
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
                target.health = Math.max(0, target.health - def.damage);
                if (target.health <= 0) {
                    target.isAlive = false;
                    target.deaths++;
                    p.kills++;
                    p.credits += Weapons_1.CREDITS_KILL;
                    this.io.to(this.roomId).emit('game:event', { type: 'kill', killer: p.socketId, victim: hit.hitId });
                }
            }
        }
    }
    switchWeapon(socketId, slot) {
        const p = this.players.get(socketId);
        if (!p || !p.isAlive)
            return;
        const w = p.weapons[slot];
        if (!w && slot === 0)
            return;
        if (slot === p.currentSlot)
            return;
        this.saveWeaponAmmo(p);
        p.currentSlot = slot;
        this.applyWeaponSlot(p);
    }
    buyWeapon(socketId, weaponId) {
        const p = this.players.get(socketId);
        if (!p || !p.isAlive)
            return;
        const def = Weapons_1.WEAPONS[weaponId];
        if (!def || !def.price)
            return;
        if (p.credits < def.price)
            return;
        if (weaponId === 'ak47' || weaponId === 'm4') {
            if (p.weapons[0])
                return;
            p.credits -= def.price;
            p.weapons[0] = weaponId;
            p.weaponAmmo[weaponId] = { ammo: def.magazineSize, reserve: 0 };
            this.saveWeaponAmmo(p);
            p.currentSlot = 0;
            this.applyWeaponSlot(p);
        }
    }
    reload(socketId) {
        const p = this.players.get(socketId);
        if (!p || !p.isAlive || p.ammoReserve <= 0)
            return;
        const def = Weapons_1.WEAPONS[p.weapon];
        if (!def || p.ammo >= def.magazineSize)
            return;
        if (Date.now() < p.reloadEndTime)
            return;
        this.startReload(p);
    }
    startReload(p) {
        const def = Weapons_1.WEAPONS[p.weapon];
        if (!def || def.reloadTimeMs <= 0)
            return;
        p.reloadEndTime = Date.now() + def.reloadTimeMs;
        this.io.to(this.roomId).emit('game:event', { type: 'reloadStart', playerId: p.socketId });
    }
    processReloads() {
        const now = Date.now();
        for (const p of this.players.values()) {
            if (p.reloadEndTime > 0 && now >= p.reloadEndTime) {
                const def = Weapons_1.WEAPONS[p.weapon];
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
    tick() {
        const dt = 1 / TICK_RATE;
        const now = Date.now();
        this.lastTickTime = now;
        this.checkRoundEnd(now);
        for (const p of this.players.values()) {
            if (p.socketId.startsWith('bot-') && p.isAlive) {
                const playersList = Array.from(this.players.values()).map((op) => ({
                    id: op.socketId,
                    team: op.team,
                    x: op.x,
                    y: op.y,
                    isAlive: op.isAlive,
                }));
                const action = (0, BotAI_1.computeBotAction)(p.socketId, p.team, p.x, p.y, p.angle, playersList, this.map, this.botsConfig.difficulty, this.tickCount);
                p.lastInput = action.input;
                p.angle = action.angle;
                if (action.shoot)
                    this.shoot(p.socketId);
            }
        }
        this.processReloads();
        (0, Pickups_1.processPickups)(this.pickups, Array.from(this.players.values()), (w) => Weapons_1.WEAPONS[w]?.magazineSize ?? 30, now);
        for (const p of this.players.values()) {
            if (!p.isAlive)
                continue;
            const state = {
                x: p.x,
                y: p.y,
                vx: p.vx,
                vy: p.vy,
                angle: p.angle,
            };
            const next = (0, ServerPhysics_1.updatePlayer)(state, p.lastInput, this.map, dt);
            p.x = next.x;
            p.y = next.y;
            p.vx = next.vx;
            p.vy = next.vy;
        }
        this.tickCount++;
        this.broadcast();
    }
    broadcast() {
        const now = Date.now();
        const roundTimeLeft = this.roundPhase === 'playing'
            ? Math.max(0, Math.floor((this.roundStartTime + ROUND_TIME_MS - now) / 1000))
            : Math.max(0, Math.floor((this.roundEndAt - now) / 1000));
        const payload = {
            players: Array.from(this.players.values()).map((p) => ({
                id: p.socketId,
                x: p.x,
                y: p.y,
                angle: p.angle,
                team: p.team,
                username: p.username,
                health: p.health,
                weapon: p.weapon,
                ammo: p.ammo,
                ammoReserve: p.ammoReserve,
                isAlive: p.isAlive,
                kills: p.kills,
                deaths: p.deaths,
                credits: p.credits,
                weapons: p.weapons,
                currentSlot: p.currentSlot,
            })),
            pickups: (0, Pickups_1.getActivePickups)(this.pickups, now),
            round: this.round,
            roundTimeLeft,
            roundWins: { ...this.roundWins },
            roundPhase: this.roundPhase,
            tick: this.tickCount,
        };
        this.io.to(this.roomId).emit('game:update', payload);
    }
    getState() {
        const now = Date.now();
        const roundTimeLeft = this.roundPhase === 'playing'
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
                weapon: p.weapon,
                ammo: p.ammo,
                ammoReserve: p.ammoReserve,
                isAlive: p.isAlive,
                kills: p.kills,
                deaths: p.deaths,
                credits: p.credits,
                weapons: p.weapons,
                currentSlot: p.currentSlot,
            })),
            pickups: (0, Pickups_1.getActivePickups)(this.pickups, now),
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
    removePlayer(socketId) {
        if (!socketId.startsWith('bot-'))
            this.players.delete(socketId);
    }
}
const sessions = new Map();
async function startGameSession(io, roomId, mapId) {
    try {
        const room = RoomStore_1.RoomStore.get(roomId);
        if (!room)
            return null;
        const filePath = path_1.default.join(mapsDir, `${mapId.replace(/[^a-z0-9-]/gi, '')}.json`);
        const data = await promises_1.default.readFile(filePath, 'utf-8');
        const map = JSON.parse(data);
        const session = new GameSession(io, roomId, map, room.roundsToWin, room.bots);
        sessions.set(roomId, session);
        session.start();
        return session;
    }
    catch (err) {
        console.error('Failed to start game session:', err);
        return null;
    }
}
function getGameSession(roomId) {
    return sessions.get(roomId);
}
function stopGameSession(roomId) {
    const session = sessions.get(roomId);
    if (session) {
        session.stop();
        sessions.delete(roomId);
    }
}
