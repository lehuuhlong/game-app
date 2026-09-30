/**
 * GET /api/matches/h2h?player1=Alice&player2=Bob&gameType=all|caro|chess|...
 *
 * Returns Head-to-Head rivalry stats between two players:
 * - totalMatches
 * - player1Wins, player2Wins, draws
 * - win rates
 * - per-game breakdown
 * - recent match history timeline
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Match from "@/models/Match";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const p1 = searchParams.get("player1")?.trim();
    const p2 = searchParams.get("player2")?.trim();
    const gameType = searchParams.get("gameType")?.trim();

    if (!p1 || !p2) {
      return NextResponse.json(
        { error: "Both player1 and player2 query parameters are required" },
        { status: 400 }
      );
    }

    if (p1 === p2) {
      return NextResponse.json(
        { error: "player1 and player2 must be distinct users" },
        { status: 400 }
      );
    }

    // Fetch user profiles for avatars & display
    const [user1, user2] = await Promise.all([
      User.findOne({ username: p1 })
        .select("_id username avatarUrl")
        .lean(),
      User.findOne({ username: p2 })
        .select("_id username avatarUrl")
        .lean(),
    ]);

    const user1Filter = user1
      ? { $or: [{ "players.userId": user1._id }, { "players.username": p1 }] }
      : { "players.username": p1 };

    const user2Filter = user2
      ? { $or: [{ "players.userId": user2._id }, { "players.username": p2 }] }
      : { "players.username": p2 };

    const query: Record<string, unknown> = {
      $and: [user1Filter, user2Filter],
    };

    if (gameType && gameType !== "all") {
      query.gameType = gameType;
    }

    const matches = await Match.find(query)
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    const isP1 = (p: any) =>
      (user1 && p.userId?.toString() === user1._id.toString()) ||
      p.username === p1;

    const isP2 = (p: any) =>
      (user2 && p.userId?.toString() === user2._id.toString()) ||
      p.username === p2;

    let p1Wins = 0;
    let p2Wins = 0;
    let draws = 0;

    const byGame: Record<
      string,
      {
        total: number;
        p1Wins: number;
        p2Wins: number;
        draws: number;
        p1WinRate: number;
      }
    > = {};

    matches.forEach((m) => {
      const p1Record = m.players.find(isP1);
      const p2Record = m.players.find(isP2);

      if (!byGame[m.gameType]) {
        byGame[m.gameType] = {
          total: 0,
          p1Wins: 0,
          p2Wins: 0,
          draws: 0,
          p1WinRate: 0,
        };
      }

      const g = byGame[m.gameType];
      g.total += 1;

      if (p1Record?.result === "win") {
        p1Wins += 1;
        g.p1Wins += 1;
      } else if (p2Record?.result === "win") {
        p2Wins += 1;
        g.p2Wins += 1;
      } else {
        draws += 1;
        g.draws += 1;
      }
    });

    // Calculate win rates for per-game breakdown
    Object.keys(byGame).forEach((gt) => {
      const g = byGame[gt];
      g.p1WinRate = g.total > 0 ? Math.round((g.p1Wins / g.total) * 100) : 0;
    });

    const totalMatches = matches.length;
    const p1WinRate =
      totalMatches > 0 ? Math.round((p1Wins / totalMatches) * 100) : 0;
    const p2WinRate =
      totalMatches > 0 ? Math.round((p2Wins / totalMatches) * 100) : 0;

    const recentMatches = matches.slice(0, 15).map((m) => {
      const p1Record = m.players.find(isP1);
      const p2Record = m.players.find(isP2);
      let outcome: "p1" | "p2" | "draw" = "draw";
      if (p1Record?.result === "win") outcome = "p1";
      else if (p2Record?.result === "win") outcome = "p2";

      return {
        id: (m as any)._id.toString(),
        gameType: m.gameType,
        outcome,
        p1Result: p1Record?.result || "draw",
        p2Result: p2Record?.result || "draw",
        duration: m.duration || 0,
        gameData: m.gameData || {},
        createdAt: m.createdAt,
      };
    });

    return NextResponse.json({
      player1: {
        username: user1?.username || p1,
        avatarUrl: user1?.avatarUrl || null,
        wins: p1Wins,
        winRate: p1WinRate,
      },
      player2: {
        username: user2?.username || p2,
        avatarUrl: user2?.avatarUrl || null,
        wins: p2Wins,
        winRate: p2WinRate,
      },
      totalMatches,
      draws,
      byGame,
      recentMatches,
    });
  } catch (error) {
    console.error("GET /api/matches/h2h error:", error);
    return NextResponse.json(
      { error: "Failed to calculate Head-to-Head stats" },
      { status: 500 }
    );
  }
}
