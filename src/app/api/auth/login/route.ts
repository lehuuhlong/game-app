/**
 * POST /api/auth/login — username-only login/register
 * PATCH /api/auth/login — change username
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Match from "@/models/Match";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeUsername(username: string): string {
  if (typeof username !== "string") return "";
  return username
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function validateUsername(username: string) {
  const u = sanitizeUsername(username);
  if (!u) return "Username is required";
  if (u.length < 2 || u.length > 30) return "Username must be 2–30 characters";
  return null;
}

function toClientUser(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    username: user.username,
    avatarUrl: user.avatarUrl ?? null,
    bestScore2048: user.bestScore2048 ?? 0,
    highest2048Tile: user.highest2048Tile ?? 0,
    caroWins: user.caroWins ?? 0,
    caroTotal: user.caroTotal ?? 0,
    msBestBeginner: user.msBestBeginner ?? 0,
    msBestIntermediate: user.msBestIntermediate ?? 0,
    msBestExpert: user.msBestExpert ?? 0,
    wordleWins: user.wordleWins ?? 0,
    wordleTotal: user.wordleTotal ?? 0,
    wordleGuesses1: user.wordleGuesses1 ?? 0,
    wordleGuesses2: user.wordleGuesses2 ?? 0,
    wordleGuesses3: user.wordleGuesses3 ?? 0,
    wordleGuesses4: user.wordleGuesses4 ?? 0,
    wordleGuesses5: user.wordleGuesses5 ?? 0,
    wordleGuesses6: user.wordleGuesses6 ?? 0,
    bestScoreTrex: user.bestScoreTrex ?? 0,
    bestScoreFlappy: user.bestScoreFlappy ?? 0,
    wordchainWins: user.wordchainWins ?? 0,
    wordchainTotal: user.wordchainTotal ?? 0,
    sudokuBestEasy: user.sudokuBestEasy ?? 0,
    sudokuBestMedium: user.sudokuBestMedium ?? 0,
    sudokuBestHard: user.sudokuBestHard ?? 0,
    chessWins: user.chessWins ?? 0,
    chessTotal: user.chessTotal ?? 0,
    aimTrainerBestScore: user.aimTrainerBestScore ?? 0,
    aimTrainerBestAccuracy: user.aimTrainerBestAccuracy ?? 0,
    battleshipWins: user.battleshipWins ?? 0,
    battleshipTotal: user.battleshipTotal ?? 0,
    monopolyWins: user.monopolyWins ?? 0,
    monopolyTotal: user.monopolyTotal ?? 0,
    pikachuBestScore: user.pikachuBestScore ?? 0,
    pikachuHighestLevel: user.pikachuHighestLevel ?? 0,
    billiardsWins: user.billiardsWins ?? 0,
    billiardsTotal: user.billiardsTotal ?? 0,
    bestScoreLine98: user.bestScoreLine98 ?? 0,
    bestScoreNeonSnake: user.bestScoreNeonSnake ?? 0,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const username = searchParams.get("username");

    if (!id && !username) {
      return NextResponse.json({ error: "id or username is required" }, { status: 400 });
    }

    await dbConnect();
    let user = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user && username) {
      const clean = sanitizeUsername(username);
      user = await User.findOne({ username: clean });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: toClientUser(user) });
  } catch (error) {
    console.error("GET /api/auth/login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    const err = validateUsername(username);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    await dbConnect();

    const cleanUsername = sanitizeUsername(username);
    // Find user with exact username (case-sensitive)
    let user = await User.findOne({ username: cleanUsername });

    if (!user) {
      try {
        user = await User.create({ username: cleanUsername });
      } catch (createErr: unknown) {
        const mongoErr = createErr as { code?: number };
        if (mongoErr && mongoErr.code === 11000) {
          user = await User.findOne({ username: cleanUsername });
        }
        if (!user) throw createErr;
      }
    }

    return NextResponse.json({ user: toClientUser(user) });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, newUsername } = await request.json();
    const err = validateUsername(newUsername);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    await dbConnect();

    const cleanUsername = sanitizeUsername(newUsername);
    // Exact match: check if another account already has this exact username
    const existing = await User.findOne({ username: cleanUsername });
    if (existing && existing._id.toString() !== id) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const oldUsername = user.username;
    user.username = cleanUsername;
    await user.save();

    // 1. Update all matches where this user played by userId
    await Match.updateMany(
      { "players.userId": user._id },
      { $set: { "players.$[elem].username": cleanUsername } },
      { arrayFilters: [{ "elem.userId": user._id }] }
    );

    // 2. Also update any legacy matches where players.username was exact oldUsername
    if (oldUsername && oldUsername !== cleanUsername) {
      await Match.updateMany(
        { "players.username": oldUsername },
        {
          $set: {
            "players.$[elem].username": cleanUsername,
            "players.$[elem].userId": user._id,
          },
        },
        { arrayFilters: [{ "elem.username": oldUsername }] }
      );
    }

    return NextResponse.json({ user: toClientUser(user) });
  } catch (error) {
    console.error("PATCH /api/auth/login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
