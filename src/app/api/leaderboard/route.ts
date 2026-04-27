/**
 * Leaderboard API route.
 *
 * GET /api/leaderboard?game=2048   → Top 10 by bestScore2048 (score > 0)
 * GET /api/leaderboard?game=caro   → Top 10 by caroWins (wins > 0), then caroTotal desc
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game"); // "2048" | "caro"

    if (game === "2048") {
      const leaderboard = await User.find({ bestScore2048: { $gt: 0 } })
        .select("username avatarUrl bestScore2048")
        .sort({ bestScore2048: -1 })
        .limit(10)
        .lean();

      return NextResponse.json({
        game: "2048",
        leaderboard: leaderboard.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          avatarUrl: u.avatarUrl || null,
          score: u.bestScore2048,
        })),
      });
    }

    if (game === "caro") {
      const leaderboard = await User.find({ caroWins: { $gt: 0 } })
        .select("username avatarUrl caroWins caroTotal")
        .sort({ caroWins: -1, caroTotal: -1 })
        .limit(10)
        .lean();

      return NextResponse.json({
        game: "caro",
        leaderboard: leaderboard.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          avatarUrl: u.avatarUrl || null,
          wins: u.caroWins,
          total: u.caroTotal,
          winRate: u.caroTotal > 0 ? Math.round((u.caroWins / u.caroTotal) * 100) : 0,
        })),
      });
    }

    return NextResponse.json({ error: "Missing ?game= parameter" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
