/**
 * Matches API route — full implementation.
 *
 * GET  /api/matches                  → List recent matches
 * GET  /api/matches?gameType=2048    → Filter by game type
 * POST /api/matches                  → Record a completed match
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Match from "@/models/Match";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get("gameType");
    const username = searchParams.get("username");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (gameType && gameType !== "all") {
      filter.gameType = gameType;
    }
    if (username) {
      filter["players.username"] = username;
    }

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments(filter),
    ]);

    // Fetch avatars for players
    const usernamesToFetch = Array.from(
      new Set(
        matches.flatMap((m) => m.players.map((p) => p.username)).filter(Boolean)
      )
    );

    const userAvatars = await User.find({
      username: { $in: usernamesToFetch },
    })
      .select("username avatarUrl")
      .lean();

    const avatarMap = new Map<string, string | null>(
      userAvatars.map((u) => [u.username, u.avatarUrl || null])
    );

    const enrichedMatches = matches.map((m) => ({
      ...m,
      players: m.players.map((p) => ({
        ...p,
        avatarUrl: avatarMap.get(p.username) ?? null,
      })),
    }));

    return NextResponse.json({
      matches: enrichedMatches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/matches error:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { gameType, players, duration, gameData } = body;

    if (!gameType || !players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: "gameType and players[] are required" },
        { status: 400 }
      );
    }

    // Auto-link user IDs if not provided
    const usernames = players.map((p: any) => p.username).filter(Boolean);
    const existingUsers = await User.find({ username: { $in: usernames } })
      .select("_id username")
      .lean();
    const userMap = new Map<string, any>(
      existingUsers.map((u) => [u.username, u._id])
    );

    const formattedPlayers = players.map((p: any) => ({
      userId: p.userId || userMap.get(p.username) || null,
      username: p.username,
      score: p.score ?? 0,
      result: p.result,
    }));

    const match = await Match.create({
      gameType,
      players: formattedPlayers,
      duration: duration || 0,
      gameData: gameData || {},
    });

    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    console.error("POST /api/matches error:", error);
    return NextResponse.json(
      { error: "Failed to record match" },
      { status: 500 }
    );
  }
}
