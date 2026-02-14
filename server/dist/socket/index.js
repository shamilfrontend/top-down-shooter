"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const RoomStore_1 = require("../game/RoomStore");
const GameSession_1 = require("../game/GameSession");
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
function getAuth(socket) {
    const token = socket.handshake.auth?.token;
    if (!token)
        return null;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return {
            userId: decoded.userId,
            username: decoded.username || decoded.email?.split('@')[0] || decoded.userId || socket.id,
        };
    }
    catch {
        return null;
    }
}
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        const auth = getAuth(socket);
        const username = auth?.username || `Guest-${socket.id.slice(0, 6)}`;
        socket.on('room:create', (options) => {
            const room = RoomStore_1.RoomStore.create(socket.id, auth?.userId, username, {
                name: options.name || 'Комната',
                password: options.password,
                map: options.map,
                maxPlayers: options.maxPlayers,
                bots: options.bots,
            });
            socket.join(room.id);
            socket.emit('room:created', RoomStore_1.RoomStore.toState(room));
        });
        socket.on('room:list', () => {
            socket.emit('room:list', RoomStore_1.RoomStore.list());
        });
        socket.on('room:join', (data) => {
            const result = RoomStore_1.RoomStore.join(data.roomId, socket.id, auth?.userId, username, data.password);
            if (!result.success) {
                socket.emit('room:error', result.error);
                return;
            }
            const room = RoomStore_1.RoomStore.get(data.roomId);
            socket.join(data.roomId);
            socket.emit('room:joined', RoomStore_1.RoomStore.toState(room));
            socket.to(data.roomId).emit('room:update', RoomStore_1.RoomStore.toState(room));
        });
        socket.on('room:leave', () => {
            const result = RoomStore_1.RoomStore.leave(socket.id);
            if (result) {
                socket.leave(result.roomId);
                socket.emit('room:left', { roomId: result.roomId });
                const room = RoomStore_1.RoomStore.get(result.roomId);
                if (room) {
                    socket.to(result.roomId).emit('room:update', RoomStore_1.RoomStore.toState(room));
                }
            }
        });
        socket.on('room:ready', (ready) => {
            const room = RoomStore_1.RoomStore.setReady(socket.id, ready);
            if (room) {
                io.to(room.id).emit('room:update', RoomStore_1.RoomStore.toState(room));
            }
        });
        socket.on('room:changeTeam', (team) => {
            const room = RoomStore_1.RoomStore.setTeam(socket.id, team);
            if (room) {
                io.to(room.id).emit('room:update', RoomStore_1.RoomStore.toState(room));
            }
        });
        socket.on('room:changeBots', (bots) => {
            const room = RoomStore_1.RoomStore.setBots(socket.id, bots);
            if (room) {
                io.to(room.id).emit('room:update', RoomStore_1.RoomStore.toState(room));
            }
        });
        socket.on('room:start', async () => {
            const room = RoomStore_1.RoomStore.getRoomBySocket(socket.id);
            if (!room || room.hostId !== socket.id) {
                socket.emit('room:error', 'Только хост может начать игру');
                return;
            }
            const minPlayers = room.bots.enabled && room.bots.count > 0 ? 1 : 2;
            if (room.players.size < minPlayers) {
                socket.emit('room:error', minPlayers === 1 ? 'Добавьте хотя бы 1 игрока или включите ботов' : 'Нужно минимум 2 игрока');
                return;
            }
            room.status = 'playing';
            io.to(room.id).emit('game:starting', { room: RoomStore_1.RoomStore.toState(room), mapId: room.map });
            const session = await (0, GameSession_1.startGameSession)(io, room.id, room.map);
            if (session) {
                const state = session.getState();
                io.to(room.id).emit('game:state', state);
            }
            else {
                socket.emit('room:error', 'Ошибка загрузки карты');
                room.status = 'waiting';
            }
        });
        socket.on('player:move', (input) => {
            const room = RoomStore_1.RoomStore.getRoomBySocket(socket.id);
            if (!room?.id)
                return;
            const session = (0, GameSession_1.getGameSession)(room.id);
            if (!session)
                return;
            session.setInput(socket.id, {
                up: !!input.up,
                down: !!input.down,
                left: !!input.left,
                right: !!input.right,
            });
            if (typeof input.angle === 'number') {
                session.setAngle(socket.id, input.angle);
            }
        });
        socket.on('player:shoot', () => {
            const room = RoomStore_1.RoomStore.getRoomBySocket(socket.id);
            if (!room?.id)
                return;
            const session = (0, GameSession_1.getGameSession)(room.id);
            if (session)
                session.shoot(socket.id);
        });
        socket.on('player:reload', () => {
            const room = RoomStore_1.RoomStore.getRoomBySocket(socket.id);
            if (!room?.id)
                return;
            const session = (0, GameSession_1.getGameSession)(room.id);
            if (session)
                session.reload(socket.id);
        });
        socket.on('player:buy', (weaponId) => {
            const room = RoomStore_1.RoomStore.getRoomBySocket(socket.id);
            if (!room?.id)
                return;
            const session = (0, GameSession_1.getGameSession)(room.id);
            if (session)
                session.buyWeapon(socket.id, weaponId);
        });
        socket.on('player:switchWeapon', (slot) => {
            const room = RoomStore_1.RoomStore.getRoomBySocket(socket.id);
            if (!room?.id)
                return;
            const session = (0, GameSession_1.getGameSession)(room.id);
            if (session && (slot === 0 || slot === 1))
                session.switchWeapon(socket.id, slot);
        });
        socket.on('disconnect', () => {
            const room = RoomStore_1.RoomStore.getRoomBySocket(socket.id);
            if (room) {
                const session = (0, GameSession_1.getGameSession)(room.id);
                if (session)
                    session.removePlayer(socket.id);
            }
            const result = RoomStore_1.RoomStore.leave(socket.id);
            if (result) {
                const r = RoomStore_1.RoomStore.get(result.roomId);
                if (r) {
                    io.to(result.roomId).emit('room:update', RoomStore_1.RoomStore.toState(r));
                }
                else {
                    (0, GameSession_1.stopGameSession)(result.roomId);
                }
            }
        });
    });
}
