"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const mapsDir = path_1.default.join(process.cwd(), 'data', 'maps');
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const files = await promises_1.default.readdir(mapsDir);
        const maps = await Promise.all(files
            .filter((f) => f.endsWith('.json'))
            .map(async (f) => {
            const data = await promises_1.default.readFile(path_1.default.join(mapsDir, f), 'utf-8');
            const map = JSON.parse(data);
            return { id: map.id, name: map.name };
        }));
        res.json(maps);
    }
    catch (err) {
        console.error('Maps list error:', err);
        res.status(500).json({ error: 'Ошибка загрузки карт' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const safeId = id.replace(/[^a-z0-9-]/gi, '');
        const filePath = path_1.default.join(mapsDir, `${safeId}.json`);
        const data = await promises_1.default.readFile(filePath, 'utf-8');
        res.json(JSON.parse(data));
    }
    catch {
        res.status(404).json({ error: 'Карта не найдена' });
    }
});
exports.default = router;
