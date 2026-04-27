/**
 * User model for MongoDB.
 *
 * Stores player profiles, authentication data, and aggregate stats.
 * The schema is designed to work with both local auth and future
 * OAuth providers.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  avatarUrl?: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number; // Aggregate score across all games
  };
  bestScores: {
    "2048": number;
    caro: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
    },
    bestScores: {
      "2048": { type: Number, default: 0 },
      caro: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation during HMR
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
