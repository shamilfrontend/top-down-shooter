import mongoose, { Document, Schema } from 'mongoose';

export interface IGamePlayerStats {
  userId: mongoose.Types.ObjectId;
  username: string;
  team: 'ct' | 't';
  kills: number;
  deaths: number;
}

export interface IGame extends Document {
  roomId: string;
  map: string;
  winner: 'ct' | 't' | null;
  score: { ct: number; t: number };
  players: IGamePlayerStats[];
  duration: number; // секунды
  finishedAt: Date;
}

const GamePlayerStatsSchema = new Schema<IGamePlayerStats>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  team: { type: String, enum: ['ct', 't'], required: true },
  kills: { type: Number, default: 0 },
  deaths: { type: Number, default: 0 },
});

const GameSchema = new Schema<IGame>(
  {
    roomId: { type: String, required: true },
    map: { type: String, required: true },
    winner: { type: String, enum: ['ct', 't'], default: null },
    score: {
      ct: { type: Number, default: 0 },
      t: { type: Number, default: 0 },
    },
    players: [GamePlayerStatsSchema],
    duration: { type: Number, default: 0 },
    finishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Game = mongoose.model<IGame>('Game', GameSchema);
