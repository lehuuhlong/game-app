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

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get("gameType");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    const filter = gameType ? { gameType } : {};

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments(filter),
    ]);

    return NextResponse.json({
      matches,
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

    const match = await Match.create({
      gameType,
      players,
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
