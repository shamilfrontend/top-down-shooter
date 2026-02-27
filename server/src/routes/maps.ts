import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';

const mapsDir = path.join(process.cwd(), 'data', 'maps');

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const files = await fs.readdir(mapsDir);
    const maps = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const data = await fs.readFile(path.join(mapsDir, f), 'utf-8');
          const map = JSON.parse(data);
          return { id: map.id, name: map.name };
        })
    );
    res.json(maps);
  } catch (err) {
    console.error('Maps list error:', err);
    res.status(500).json({ error: 'Ошибка загрузки карт' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = id.replace(/[^a-z0-9-]/gi, '');
    const filePath = path.join(mapsDir, `${safeId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: 'Карта не найдена' });
  }
});

export default router;
