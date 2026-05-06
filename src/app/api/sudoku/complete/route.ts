/**
 * POST /api/sudoku/complete
 *
 * Body: { username: string; difficulty: "easy" | "medium" | "hard"; timeSeconds: number }
 *
 * Updates the user's best Sudoku time for the given difficulty if the new
 * time is better (lower) than the existing record, or sets it if not yet set.
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

const FIELD_MAP: Record<string, string> = {
  easy: "sudokuBestEasy",
  medium: "sudokuBestMedium",
  hard: "sudokuBestHard",
};

export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { username, difficulty, timeSeconds } = body as {
      username: string;
      difficulty: string;
      timeSeconds: number;
    };

    if (!username || !difficulty || typeof timeSeconds !== "number" || timeSeconds <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const field = FIELD_MAP[difficulty];
    if (!field) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }

    // Upsert user; update best time only if new time is better (lower), or not set yet
    const user = await User.findOne({ username });

    if (!user) {
      // Create new user with this as their first record
      await User.create({
        username,
        [field]: timeSeconds,
      });
      return NextResponse.json({ success: true, newBest: true, time: timeSeconds });
    }

    const existing = (user as any)[field] as number;
    const isNewBest = existing === 0 || timeSeconds < existing;

    if (isNewBest) {
      await User.updateOne({ username }, { $set: { [field]: timeSeconds } });
    }

    return NextResponse.json({ success: true, newBest: isNewBest, time: timeSeconds });
  } catch (error) {
    console.error("POST /api/sudoku/complete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
