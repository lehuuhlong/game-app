/**
 * GameSession model for MongoDB.
 *
 * Tracks individual game lifecycles from start to finish.
 * Uses a TTL index to automatically purge expired sessions after 2 hours.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IGameSession extends Document {
  sessionId: string;
  userId?: mongoose.Types.ObjectId | null;
  username?: string | null;
  gameType: string;
  startTime: Date;
  completed: boolean;
  scoreSubmitted?: boolean;
  matchSubmitted?: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const GameSessionSchema = new Schema<IGameSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    username: {
      type: String,
      default: null,
    },
    gameType: {
      type: String,
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    scoreSubmitted: {
      type: Boolean,
      default: false,
    },
    matchSubmitted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 7200, // 2 hours TTL auto-deletion
    },
  },
  {
    timestamps: true,
  }
);

GameSessionSchema.index({ sessionId: 1, completed: 1 });

if (process.env.NODE_ENV === "development" && mongoose.models.GameSession) {
  delete mongoose.models.GameSession;
}

const GameSession: Model<IGameSession> =
  mongoose.models.GameSession ||
  mongoose.model<IGameSession>("GameSession", GameSessionSchema);

export default GameSession;
