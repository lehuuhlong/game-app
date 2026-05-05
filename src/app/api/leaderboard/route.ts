/**
 * Leaderboard API route.
 *
 * GET /api/leaderboard?game=2048                       → Top 10 by bestScore2048 (score > 0)
 * GET /api/leaderboard?game=caro                       → Top 10 by caroTotal (total > 0)
 * GET /api/leaderboard?game=minesweeper&level=beginner → Top 10 fastest times
 * GET /api/leaderboard?game=minesweeper&level=intermediate
 * GET /api/leaderboard?game=minesweeper&level=expert
 * GET /api/leaderboard?game=wordle                     → Top 10 by wordleWins (wins > 0)
 * GET /api/leaderboard?game=wordchain                  → Top 10 by wordchainTotal (total > 0)
 * GET /api/leaderboard?game=trex                       → Top 10 by bestScoreTrex (score > 0)
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

const MS_FIELD_MAP: Record<string, string> = {
  beginner:     "msBestBeginner",
  intermediate: "msBestIntermediate",
  expert:       "msBestExpert",
};

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game");

    if (game === "2048") {
      const leaderboard = await User.find({ bestScore2048: { $gt: 0 } })
        .select("username avatarUrl bestScore2048 highest2048Tile")
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
          highestTile: (u as any).highest2048Tile || 0,
        })),
      });
    }

    if (game === "caro") {
      const leaderboard = await User.find({ caroTotal: { $gt: 0 } })
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

    if (game === "minesweeper") {
      const level = searchParams.get("level") || "beginner";
      const field = MS_FIELD_MAP[level];
      if (!field) {
        return NextResponse.json({ error: "Invalid level" }, { status: 400 });
      }

      const leaderboard = await User.find({ [field]: { $gt: 0 } })
        .select(`username avatarUrl ${field}`)
        .sort({ [field]: 1 }) // ascending = fastest time first
        .limit(10)
        .lean();

      return NextResponse.json({
        game: "minesweeper",
        level,
        leaderboard: leaderboard.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          avatarUrl: u.avatarUrl || null,
          time: (u as unknown as Record<string, number>)[field] ?? 0,
        })),
      });
    }

    if (game === "wordle") {
      const leaderboard = await User.find({ wordleWins: { $gt: 0 } })
        .select("username avatarUrl wordleWins")
        .sort({ wordleWins: -1 })
        .limit(10)
        .lean();

      return NextResponse.json({
        game: "wordle",
        leaderboard: leaderboard.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          avatarUrl: u.avatarUrl || null,
          wins: u.wordleWins,
        })),
      });
    }

    if (game === "trex") {
      const leaderboard = await User.find({ bestScoreTrex: { $gt: 0 } })
        .select("username avatarUrl bestScoreTrex")
        .sort({ bestScoreTrex: -1 })
        .limit(10)
        .lean();

      return NextResponse.json({
        game: "trex",
        leaderboard: leaderboard.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          avatarUrl: u.avatarUrl || null,
          score: u.bestScoreTrex,
        })),
      });
    }

    if (game === "wordchain") {
      const leaderboard = await User.find({ wordchainTotal: { $gt: 0 } })
        .select("username avatarUrl wordchainWins wordchainTotal")
        .sort({ wordchainWins: -1, wordchainTotal: -1 })
        .limit(10)
        .lean();

      return NextResponse.json({
        game: "wordchain",
        leaderboard: leaderboard.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          avatarUrl: u.avatarUrl || null,
          wins: u.wordchainWins,
          total: u.wordchainTotal,
          winRate: u.wordchainTotal > 0 ? Math.round((u.wordchainWins / u.wordchainTotal) * 100) : 0,
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
