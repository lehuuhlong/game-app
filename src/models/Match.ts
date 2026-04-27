/**
 * Match model for MongoDB.
 *
 * Records individual game sessions for leaderboard and history.
 * The `gameData` field uses a flexible Mixed type to accommodate
 * different game-specific payloads (e.g. final 2048 board vs.
 * Caro move history).
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { GameType } from "@/types/socket";

export interface IMatch extends Document {
  gameType: GameType;
  players: {
    userId: mongoose.Types.ObjectId;
    username: string;
    score: number;
    result: "win" | "loss" | "draw";
  }[];
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
      enum: ["2048", "caro"],
    },
    players: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
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

// Index for leaderboard queries
MatchSchema.index({ gameType: 1, "players.score": -1 });
MatchSchema.index({ "players.userId": 1, createdAt: -1 });

const Match: Model<IMatch> =
  mongoose.models.Match || mongoose.model<IMatch>("Match", MatchSchema);

export default Match;
