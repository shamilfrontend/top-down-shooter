import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

import mapsRoutes from './routes/maps';
import { setupSocketHandlers } from './socket';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/maps', mapsRoutes);

const clientDist = path.join(process.cwd(), 'client', 'dist');

app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
