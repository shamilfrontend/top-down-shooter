"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.me = me;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SALT_ROUNDS = 10;
async function register(req, res) {
    try {
        const { email, username, password } = req.body;
        if (!email || !username || !password) {
            res.status(400).json({ error: 'Заполните все поля' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
            return;
        }
        const existingUser = await User_1.User.findOne({
            $or: [{ email }, { username }],
        });
        if (existingUser) {
            res.status(400).json({
                error: existingUser.email === email ? 'Email уже занят' : 'Имя пользователя уже занято',
            });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const user = await User_1.User.create({
            email,
            username,
            password: hashedPassword,
        });
        const token = jsonwebtoken_1.default.sign({ userId: user._id.toString(), email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                username: user.username,
                stats: user.stats,
            },
        });
    }
    catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Заполните все поля' });
            return;
        }
        const user = await User_1.User.findOne({ email });
        if (!user) {
            res.status(401).json({ error: 'Неверный email или пароль' });
            return;
        }
        const match = await bcrypt_1.default.compare(password, user.password);
        if (!match) {
            res.status(401).json({ error: 'Неверный email или пароль' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id.toString(), email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                username: user.username,
                stats: user.stats,
            },
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
}
async function me(req, res) {
    if (!req.user) {
        res.status(401).json({ error: 'Не авторизован' });
        return;
    }
    res.json({ user: req.user });
}
