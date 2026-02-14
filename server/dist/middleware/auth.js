"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
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
        const user = await User_1.User.findById(decoded.userId).select('-password');
        if (!user) {
            res.status(401).json({ error: 'Пользователь не найден' });
            return;
        }
        req.user = {
            id: user._id.toString(),
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
