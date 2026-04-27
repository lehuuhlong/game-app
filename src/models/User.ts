/**
 * User model for MongoDB.
 * Username is the only required field — acts as both login key and display name.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  avatarUrl?: string | null;
  bestScore2048: number;       // 2048: best score only
  caroWins: number;            // Caro: total wins
  caroTotal: number;           // Caro: total games played
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
    bestScore2048: { type: Number, default: 0 },
    caroWins:      { type: Number, default: 0 },
    caroTotal:     { type: Number, default: 0 },
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
