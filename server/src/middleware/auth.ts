import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findById } from '../db/users';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    stats?: { totalKills: number; totalDeaths: number; gamesPlayed: number; wins: number };
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const id = Number(decoded.userId);
    if (Number.isNaN(id)) {
      res.status(401).json({ error: 'Недействительный токен' });
      return;
    }

    const user = findById(id);

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
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}
