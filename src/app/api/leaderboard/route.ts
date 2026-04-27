/**
 * Leaderboard API route.
 *
 * GET /api/leaderboard?game=2048&limit=10  → Top scores for a game
 * GET /api/leaderboard                     → Overall top players
 *
 * Returns aggregated leaderboard data from Users collection.
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game"); // "2048" | "caro" | null
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

    let sortField: string;
    let selectFields: string;

    if (game === "2048") {
      sortField = "bestScores.2048";
      selectFields = "username avatarUrl bestScores.2048 stats.gamesPlayed";
    } else if (game === "caro") {
      sortField = "bestScores.caro";
      selectFields = "username avatarUrl bestScores.caro stats.gamesPlayed stats.gamesWon";
    } else {
      // Overall leaderboard by total score
      sortField = "stats.totalScore";
      selectFields = "username avatarUrl stats bestScores";
    }

    const leaderboard = await User.find()
      .select(selectFields)
      .sort({ [sortField]: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      game: game || "overall",
      leaderboard,
    });
  } catch (error) {
    console.error("GET /api/leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
