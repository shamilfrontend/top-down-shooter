"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomStore = void 0;
const DEFAULT_MAP = 'dust2';
const DEFAULT_MAX_PLAYERS = 10;
const DEFAULT_ROUNDS_TO_WIN = 13;
const DEFAULT_BOTS = {
    enabled: false,
    difficulty: 'medium',
    count: 1,
};
class RoomStoreClass {
    constructor() {
        this.rooms = new Map();
    }
    create(hostSocketId, hostUserId, hostUsername, options) {
        const id = crypto.randomUUID();
        const player = {
            socketId: hostSocketId,
            userId: hostUserId,
            username: hostUsername,
            team: 'ct',
            isReady: false,
            isHost: true,
        };
        const room = {
            id,
            name: options.name,
            password: options.password,
            map: options.map ?? DEFAULT_MAP,
            maxPlayers: options.maxPlayers ?? DEFAULT_MAX_PLAYERS,
            roundsToWin: options.roundsToWin ?? DEFAULT_ROUNDS_TO_WIN,
            bots: { ...DEFAULT_BOTS, ...options.bots },
            hostId: hostSocketId,
            status: 'waiting',
            players: new Map([[hostSocketId, player]]),
            createdAt: new Date(),
        };
        this.rooms.set(id, room);
        return room;
    }
    get(id) {
        return this.rooms.get(id);
    }
    getRoomBySocket(socketId) {
        for (const room of this.rooms.values()) {
            if (room.players.has(socketId))
                return room;
        }
        return undefined;
    }
    list() {
        return Array.from(this.rooms.values())
            .filter((r) => r.status === 'waiting')
            .map((r) => ({
            id: r.id,
            name: r.name,
            map: r.map,
            maxPlayers: r.maxPlayers,
            playerCount: r.players.size,
            hasPassword: !!r.password,
            status: r.status,
        }));
    }
    join(roomId, socketId, userId, username, password) {
        const room = this.rooms.get(roomId);
        if (!room)
            return { success: false, error: 'Комната не найдена' };
        if (room.status !== 'waiting')
            return { success: false, error: 'Игра уже началась' };
        if (room.players.size >= room.maxPlayers)
            return { success: false, error: 'Комната заполнена' };
        if (room.password && room.password !== password)
            return { success: false, error: 'Неверный пароль' };
        if (room.players.has(socketId))
            return { success: false, error: 'Вы уже в комнате' };
        const team = this.getTeamWithFewerPlayers(room);
        const player = {
            socketId,
            userId,
            username,
            team,
            isReady: false,
            isHost: false,
        };
        room.players.set(socketId, player);
        return { success: true };
    }
    leave(socketId) {
        const room = this.getRoomBySocket(socketId);
        if (!room)
            return null;
        room.players.delete(socketId);
        if (room.players.size === 0) {
            this.rooms.delete(room.id);
            return { roomId: room.id };
        }
        let newHostId;
        if (room.hostId === socketId) {
            const nextHost = room.players.values().next().value;
            if (nextHost) {
                nextHost.isHost = true;
                room.hostId = nextHost.socketId;
                newHostId = nextHost.socketId;
            }
        }
        return { roomId: room.id, newHostId };
    }
    setReady(socketId, ready) {
        const room = this.getRoomBySocket(socketId);
        const player = room?.players.get(socketId);
        if (player)
            player.isReady = ready;
        return room;
    }
    setBots(socketId, bots) {
        const room = this.getRoomBySocket(socketId);
        if (!room || room.hostId !== socketId)
            return undefined;
        room.bots = { ...room.bots, ...bots };
        return room;
    }
    setTeam(socketId, team) {
        const room = this.getRoomBySocket(socketId);
        const player = room?.players.get(socketId);
        if (!player)
            return undefined;
        const ctCount = Array.from(room.players.values()).filter((p) => p.team === 'ct').length;
        const tCount = Array.from(room.players.values()).filter((p) => p.team === 't').length;
        const maxPerTeam = Math.ceil(room.maxPlayers / 2);
        const targetCount = team === 'ct' ? ctCount : tCount;
        const otherCount = team === 'ct' ? tCount : ctCount;
        if (player.team === team)
            return room;
        if (targetCount >= maxPerTeam && otherCount <= targetCount)
            return room;
        player.team = team;
        return room;
    }
    toState(room) {
        const players = Array.from(room.players.values());
        return {
            id: room.id,
            name: room.name,
            map: room.map,
            maxPlayers: room.maxPlayers,
            roundsToWin: room.roundsToWin,
            bots: { ...room.bots },
            players,
            teams: {
                ct: players.filter((p) => p.team === 'ct'),
                t: players.filter((p) => p.team === 't'),
            },
            hostId: room.hostId,
            status: room.status,
        };
    }
    getTeamWithFewerPlayers(room) {
        let ct = 0, t = 0;
        for (const p of room.players.values()) {
            if (p.team === 'ct')
                ct++;
            else
                t++;
        }
        return ct <= t ? 'ct' : 't';
    }
}
exports.RoomStore = new RoomStoreClass();
