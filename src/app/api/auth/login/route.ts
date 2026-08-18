/**
 * POST /api/auth/login — username-only login/register
 * PATCH /api/auth/login — change username
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

function validateUsername(username: string) {
  const u = username.trim();
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
    bestScoreTrex: user.bestScoreTrex ?? 0,
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
  };
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    const err = validateUsername(username);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    await dbConnect();

    const cleanUsername = username.trim();
    let user = await User.findOne({ username: cleanUsername });

    if (!user) {
      user = await User.create({ username: cleanUsername });
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

    const cleanUsername = newUsername.trim();
    const existing = await User.findOne({ username: cleanUsername });
    if (existing && existing._id.toString() !== id) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    const user = await User.findByIdAndUpdate(
      id,
      { username: cleanUsername },
      { new: true }
    );

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user: toClientUser(user) });
  } catch (error) {
    console.error("PATCH /api/auth/login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
