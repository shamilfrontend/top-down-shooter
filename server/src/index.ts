import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import mapsRoutes from './routes/maps';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/maps', mapsRoutes);

const clientDist = path.join(process.cwd(), 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

import { setupSocketHandlers } from './socket';

setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

async function start() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
