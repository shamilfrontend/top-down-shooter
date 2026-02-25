"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const users_1 = require("../db/users");
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            res.status(401).json({ error: 'Требуется авторизация' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const id = Number(decoded.userId);
        if (Number.isNaN(id)) {
            res.status(401).json({ error: 'Недействительный токен' });
            return;
        }
        const user = (0, users_1.findById)(id);
        if (!user) {
            res.status(401).json({ error: 'Пользователь не найден' });
            return;
        }
        req.user = {
            id: String(user.id),
            email: user.email,
            username: user.username,
            stats: user.stats,
        };
        next();
    }
    catch {
        res.status(401).json({ error: 'Недействительный токен' });
    }
}
