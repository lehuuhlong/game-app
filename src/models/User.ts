/**
 * User model for MongoDB.
 * Username is the only required field — it acts as both login key and display name.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  username: string;       // Unique login key + display name
  avatarUrl?: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
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
  { timestamps: true }
);

// Always rebuild during dev to pick up schema changes
if (process.env.NODE_ENV === "development" && mongoose.models.User) {
  delete mongoose.models.User;
}
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
