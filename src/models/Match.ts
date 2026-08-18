/**
 * Match model for MongoDB.
 *
 * Records individual game sessions for leaderboard and history.
 * The `gameData` field uses a flexible Mixed type to accommodate
 * different game-specific payloads (e.g. final 2048 board vs.
 * Caro move history).
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";
export type AllGameType =
  | "2048"
  | "caro"
  | "wordchain"
  | "battleship"
  | "monopoly"
  | "chess"
  | "aimtrainer"
  | "minesweeper"
  | "wordle"
  | "trex"
  | "sudoku";

export interface IMatchPlayer {
  userId?: mongoose.Types.ObjectId | null;
  username: string;
  score?: number;
  result: "win" | "loss" | "draw";
}

export interface IMatch extends Document {
  gameType: AllGameType;
  players: IMatchPlayer[];
  duration: number; // in seconds
  gameData: Record<string, unknown>; // game-specific payload
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    gameType: {
      type: String,
      required: true,
      enum: [
        "2048",
        "caro",
        "wordchain",
        "battleship",
        "monopoly",
        "chess",
        "aimtrainer",
        "minesweeper",
        "wordle",
        "trex",
        "sudoku",
      ],
    },
    players: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        username: { type: String, required: true },
        score: { type: Number, default: 0 },
        result: {
          type: String,
          enum: ["win", "loss", "draw"],
          required: true,
        },
      },
    ],
    duration: {
      type: Number,
      default: 0,
    },
    gameData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for Head-to-Head & Leaderboard queries
MatchSchema.index({ gameType: 1, createdAt: -1 });
MatchSchema.index({ "players.username": 1, createdAt: -1 });
MatchSchema.index({ "players.username": 1, gameType: 1, createdAt: -1 });
MatchSchema.index({ "players.userId": 1, createdAt: -1 });

// Always rebuild during dev to pick up schema changes
if (process.env.NODE_ENV === "development" && mongoose.models.Match) {
  delete mongoose.models.Match;
}

const Match: Model<IMatch> =
  mongoose.models.Match || mongoose.model<IMatch>("Match", MatchSchema);

export default Match;
