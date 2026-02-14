import mongoose, { Document, Schema } from 'mongoose';

export interface IUserStats {
  totalKills: number;
  totalDeaths: number;
  gamesPlayed: number;
  wins: number;
}

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  stats: IUserStats;
  createdAt: Date;
}

const UserStatsSchema = new Schema<IUserStats>(
  {
    totalKills: { type: Number, default: 0 },
    totalDeaths: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    stats: { type: UserStatsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
