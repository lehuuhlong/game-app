/**
 * User model for MongoDB.
 * Username is the only required field — acts as both login key and display name.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  avatarUrl?: string | null;
  bestScore2048: number;       // 2048: best score only
  highest2048Tile: number;     // 2048: highest tile reached
  caroWins: number;            // Caro: total wins
  caroTotal: number;           // Caro: total games played
  msBestBeginner: number;      // Minesweeper Beginner: best time (seconds, 0 = never won)
  msBestIntermediate: number;  // Minesweeper Intermediate: best time
  msBestExpert: number;        // Minesweeper Expert: best time
  wordleWins: number;          // Wordle: total successful guesses
  wordleTotal: number;         // Wordle: total games played
  wordleGuesses1: number;      // Wordle: won on 1st guess
  wordleGuesses2: number;      // Wordle: won on 2nd guess
  wordleGuesses3: number;      // Wordle: won on 3rd guess
  wordleGuesses4: number;      // Wordle: won on 4th guess
  wordleGuesses5: number;      // Wordle: won on 5th guess
  wordleGuesses6: number;      // Wordle: won on 6th guess
  bestScoreTrex: number;       // Trex: best score
  wordchainWins: number;       // Wordchain: total wins
  wordchainTotal: number;      // Wordchain: total games played
  sudokuBestEasy: number;      // Sudoku Easy: best time in seconds (0 = never won)
  sudokuBestMedium: number;    // Sudoku Medium: best time in seconds
  sudokuBestHard: number;      // Sudoku Hard: best time in seconds
  chessWins: number;           // Chess: total wins
  chessTotal: number;          // Chess: total games played
  aimTrainerBestScore: number;    // Aim Trainer: best score in 60s
  aimTrainerBestAccuracy: number; // Aim Trainer: accuracy %
  battleshipWins: number;         // Battleship: total wins
  battleshipTotal: number;        // Battleship: total games played
  monopolyWins: number;           // Monopoly: total wins
  monopolyTotal: number;          // Monopoly: total games played
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
    bestScore2048:          { type: Number, default: 0 },
    highest2048Tile:        { type: Number, default: 0 },
    caroWins:               { type: Number, default: 0 },
    caroTotal:              { type: Number, default: 0 },
    msBestBeginner:         { type: Number, default: 0 },
    msBestIntermediate:     { type: Number, default: 0 },
    msBestExpert:           { type: Number, default: 0 },
    wordleWins:             { type: Number, default: 0 },
    wordleTotal:            { type: Number, default: 0 },
    wordleGuesses1:         { type: Number, default: 0 },
    wordleGuesses2:         { type: Number, default: 0 },
    wordleGuesses3:         { type: Number, default: 0 },
    wordleGuesses4:         { type: Number, default: 0 },
    wordleGuesses5:         { type: Number, default: 0 },
    wordleGuesses6:         { type: Number, default: 0 },
    bestScoreTrex:          { type: Number, default: 0 },
    wordchainWins:          { type: Number, default: 0 },
    wordchainTotal:         { type: Number, default: 0 },
    sudokuBestEasy:         { type: Number, default: 0 },
    sudokuBestMedium:       { type: Number, default: 0 },
    sudokuBestHard:         { type: Number, default: 0 },
    chessWins:              { type: Number, default: 0 },
    chessTotal:             { type: Number, default: 0 },
    aimTrainerBestScore:    { type: Number, default: 0 },
    aimTrainerBestAccuracy: { type: Number, default: 0 },
    battleshipWins:         { type: Number, default: 0 },
    battleshipTotal:        { type: Number, default: 0 },
    monopolyWins:           { type: Number, default: 0 },
    monopolyTotal:          { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for Leaderboard & Stats queries
UserSchema.index({ bestScore2048: -1 });
UserSchema.index({ caroWins: -1, caroTotal: -1 });
UserSchema.index({ chessWins: -1, chessTotal: -1 });
UserSchema.index({ battleshipWins: -1, battleshipTotal: -1 });
UserSchema.index({ monopolyWins: -1, monopolyTotal: -1 });
UserSchema.index({ wordchainWins: -1, wordchainTotal: -1 });
UserSchema.index({ bestScoreTrex: -1 });
UserSchema.index({ aimTrainerBestScore: -1, aimTrainerBestAccuracy: -1 });
UserSchema.index({ msBestBeginner: 1 });
UserSchema.index({ msBestIntermediate: 1 });
UserSchema.index({ msBestExpert: 1 });
UserSchema.index({ sudokuBestEasy: 1 });
UserSchema.index({ sudokuBestMedium: 1 });
UserSchema.index({ sudokuBestHard: 1 });
UserSchema.index({ wordleWins: -1, wordleTotal: -1 });

// Always rebuild during dev to pick up schema changes
if (process.env.NODE_ENV === "development" && mongoose.models.User) {
  delete mongoose.models.User;
}

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
