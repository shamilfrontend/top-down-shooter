import { eq, or } from 'drizzle-orm';
import { getDb } from '../config/db';
import { users, type User } from './schema';

export interface UserPublic {
  id: number;
  email: string;
  username: string;
  stats: {
    totalKills: number;
    totalDeaths: number;
    gamesPlayed: number;
    wins: number;
  };
}

export function findByEmailOrUsername(email: string, username: string): User | undefined {
  const db = getDb();
  const rows = db.select().from(users).where(or(eq(users.email, email), eq(users.username, username))).limit(1).all();
  return rows[0];
}

export function findByEmail(email: string): User | undefined {
  const db = getDb();
  const rows = db.select().from(users).where(eq(users.email, email)).limit(1).all();
  return rows[0];
}

export function findById(id: number): UserPublic | undefined {
  const db = getDb();
  const rows = db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      totalKills: users.totalKills,
      totalDeaths: users.totalDeaths,
      gamesPlayed: users.gamesPlayed,
      wins: users.wins,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .all();
  const row = rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    stats: {
      totalKills: row.totalKills,
      totalDeaths: row.totalDeaths,
      gamesPlayed: row.gamesPlayed,
      wins: row.wins,
    },
  };
}

export function createUser(data: { email: string; username: string; password: string }): User {
  const db = getDb();
  const rows = db.insert(users).values(data).returning().all();
  if (!rows.length) throw new Error('Insert failed');
  return rows[0];
}

export function updateArmor(userId: string, armor: number): void {
  const db = getDb();
  const id = Number(userId);
  if (Number.isNaN(id)) return;
  db.update(users).set({ armor: Math.max(0, Math.min(100, armor)) }).where(eq(users.id, id)).run();
}
