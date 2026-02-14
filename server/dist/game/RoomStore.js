"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomStore = void 0;
const DEFAULT_MAP = 'dust2';
const DEFAULT_MAX_PLAYERS = 10;
const DEFAULT_ROUNDS_TO_WIN = 10;
class RoomStoreClass {
    constructor() {
        this.rooms = new Map();
    }
    create(hostSocketId, hostUserId, hostUsername, options) {
        const id = crypto.randomUUID();
        const maxPlayers = options.maxPlayers ?? DEFAULT_MAX_PLAYERS;
        const hostTeam = options.team ?? 'ct';
        const half = Math.floor(maxPlayers / 2);
        const hostSlotIndex = hostTeam === 'ct' ? 0 : half;
        const slots = [];
        for (let i = 0; i < maxPlayers; i++) {
            const team = i < half ? 'ct' : 't';
            if (i === hostSlotIndex) {
                slots.push({
                    team,
                    player: { socketId: hostSocketId, userId: hostUserId, username: hostUsername, isReady: false },
                    bot: null,
                });
            }
            else {
                slots.push({ team, player: null, bot: null });
            }
        }
        const room = {
            id,
            name: options.name,
            password: options.password,
            map: options.map ?? DEFAULT_MAP,
            maxPlayers,
            roundsToWin: options.roundsToWin ?? DEFAULT_ROUNDS_TO_WIN,
            slots,
            pending: new Map(),
            hostId: hostSocketId,
            status: 'waiting',
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
            if (room.pending.has(socketId))
                return room;
            if (room.slots.some((s) => s.player?.socketId === socketId))
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
            playerCount: this.countPlayersInRoom(r),
            hasPassword: !!r.password,
            status: r.status,
        }));
    }
    countPlayersInRoom(room) {
        const inSlots = room.slots.filter((s) => s.player !== null).length;
        return inSlots + room.pending.size;
    }
    join(roomId, socketId, userId, username, password) {
        const room = this.rooms.get(roomId);
        if (!room)
            return { success: false, error: 'Комната не найдена' };
        if (room.status !== 'waiting')
            return { success: false, error: 'Игра уже началась' };
        if (room.pending.has(socketId) || room.slots.some((s) => s.player?.socketId === socketId))
            return { success: false, error: 'Вы уже в комнате' };
        if (room.password && room.password !== password)
            return { success: false, error: 'Неверный пароль' };
        const playersInSlots = room.slots.filter((s) => s.player !== null).length;
        if (playersInSlots + room.pending.size >= room.maxPlayers)
            return { success: false, error: 'Комната заполнена' };
        room.pending.set(socketId, { userId, username });
        return { success: true };
    }
    takeSlot(socketId, slotIndex) {
        const room = this.getRoomBySocket(socketId);
        if (!room)
            return undefined;
        if (slotIndex < 0 || slotIndex >= room.slots.length)
            return undefined;
        const slot = room.slots[slotIndex];
        if (slot.player !== null || slot.bot !== null)
            return undefined;
        const pending = room.pending.get(socketId);
        let username;
        let userId;
        if (pending) {
            username = pending.username;
            userId = pending.userId;
            room.pending.delete(socketId);
        }
        else {
            const currentSlot = room.slots.find((s) => s.player?.socketId === socketId);
            if (!currentSlot?.player)
                return undefined;
            username = currentSlot.player.username;
            userId = currentSlot.player.userId;
            currentSlot.player = null;
        }
        slot.player = { socketId, userId, username, isReady: false };
        return room;
    }
    leave(socketId) {
        const room = this.getRoomBySocket(socketId);
        if (!room)
            return null;
        room.pending.delete(socketId);
        const slot = room.slots.find((s) => s.player?.socketId === socketId);
        if (slot)
            slot.player = null;
        const stillInRoom = room.pending.size > 0 || room.slots.some((s) => s.player !== null);
        if (!stillInRoom) {
            this.rooms.delete(room.id);
            return { roomId: room.id };
        }
        let newHostId;
        if (room.hostId === socketId) {
            const next = room.slots.find((s) => s.player !== null)?.player?.socketId ?? room.pending.keys().next().value;
            if (next) {
                room.hostId = next;
                newHostId = next;
            }
        }
        return { roomId: room.id, newHostId };
    }
    setReady(socketId, ready) {
        const room = this.getRoomBySocket(socketId);
        const slot = room?.slots.find((s) => s.player?.socketId === socketId);
        if (slot?.player)
            slot.player.isReady = ready;
        return room;
    }
    addBot(socketId, slotIndex, difficulty) {
        const room = this.getRoomBySocket(socketId);
        if (!room || room.hostId !== socketId)
            return undefined;
        if (slotIndex < 0 || slotIndex >= room.slots.length)
            return undefined;
        const slot = room.slots[slotIndex];
        if (slot.player !== null || slot.bot !== null)
            return undefined;
        slot.bot = { difficulty };
        return room;
    }
    removeBot(socketId, slotIndex) {
        const room = this.getRoomBySocket(socketId);
        if (!room || room.hostId !== socketId)
            return undefined;
        if (slotIndex < 0 || slotIndex >= room.slots.length)
            return undefined;
        const slot = room.slots[slotIndex];
        if (slot.bot === null)
            return undefined;
        slot.bot = null;
        return room;
    }
    toState(room) {
        const pending = Array.from(room.pending.entries()).map(([socketId, p]) => ({ socketId, username: p.username, userId: p.userId }));
        return {
            id: room.id,
            name: room.name,
            map: room.map,
            maxPlayers: room.maxPlayers,
            roundsToWin: room.roundsToWin,
            slots: room.slots.map((s) => ({ ...s, player: s.player ? { ...s.player } : null, bot: s.bot ? { ...s.bot } : null })),
            pending,
            hostId: room.hostId,
            status: room.status,
        };
    }
}
exports.RoomStore = new RoomStoreClass();
