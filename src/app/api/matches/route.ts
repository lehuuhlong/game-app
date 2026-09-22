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
      // Find the user by username to match matches by both their userId and username
      const targetUser = await User.findOne({
        username: { $regex: `^${username.trim()}$`, $options: "i" },
      })
        .select("_id")
        .lean();

      if (targetUser) {
        filter.$or = [
          { "players.userId": targetUser._id },
          { "players.username": { $regex: `^${username.trim()}$`, $options: "i" } },
        ];
      } else {
        filter["players.username"] = { $regex: `^${username.trim()}$`, $options: "i" };
      }
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

    // Fetch current profile (username and avatarUrl) by both userId and username
    const userIdsToFetch = Array.from(
      new Set(
        matches
          .flatMap((m) => m.players.map((p) => p.userId?.toString()))
          .filter(Boolean)
      )
    );
    const usernamesToFetch = Array.from(
      new Set(
        matches.flatMap((m) => m.players.map((p) => p.username)).filter(Boolean)
      )
    );

    const queryOr: Record<string, unknown>[] = [];
    if (userIdsToFetch.length > 0) {
      queryOr.push({ _id: { $in: userIdsToFetch } });
    }
    if (usernamesToFetch.length > 0) {
      queryOr.push({
        username: {
          $in: usernamesToFetch.map((name) => new RegExp(`^${name}$`, "i")),
        },
      });
    }

    const users = queryOr.length > 0
      ? await User.find({ $or: queryOr })
          .select("_id username avatarUrl")
          .lean()
      : [];

    const userByIdMap = new Map<string, { username: string; avatarUrl: string | null }>();
    const userByNameMap = new Map<string, { username: string; avatarUrl: string | null }>();

    for (const u of users) {
      const data = { username: u.username, avatarUrl: u.avatarUrl || null };
      userByIdMap.set(u._id.toString(), data);
      userByNameMap.set(u.username.toLowerCase(), data);
    }

    // Map each match participant to their LATEST username and avatarUrl
    const enrichedMatches = matches.map((m) => ({
      ...m,
      players: m.players.map((p) => {
        const u =
          (p.userId ? userByIdMap.get(p.userId.toString()) : null) ||
          userByNameMap.get(p.username?.toLowerCase());
        return {
          ...p,
          username: u ? u.username : p.username,
          avatarUrl: u ? u.avatarUrl : null,
        };
      }),
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

import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyAndConsumeGameSession } from "@/lib/gameSession";

const MULTIPLAYER_GAMES = [
  "caro",
  "chess",
  "battleship",
  "wordchain",
  "monopoly",
  "billiards",
];

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const { gameType, players, duration, gameData, sessionToken } = body;

    const isFastArcade = gameType === "flappybird" || gameType === "trex";
    const limit = isFastArcade ? 60 : 25;
    const rateCheck = checkRateLimit(`match_post:${clientIp}`, limit, 60_000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many match submissions. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
      );
    }

    await dbConnect();

    if (!gameType || !players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: "gameType and players[] are required" },
        { status: 400 }
      );
    }

    // Multiplayer integrity check: At least 2 distinct players, at most 1 winner
    if (MULTIPLAYER_GAMES.includes(gameType)) {
      if (players.length < 2) {
        return NextResponse.json(
          { error: "Multiplayer match requires at least 2 distinct players" },
          { status: 400 }
        );
      }
      const p1Name = (players[0].username || "").trim().toLowerCase();
      const p2Name = (players[1].username || "").trim().toLowerCase();
      if (p1Name && p2Name && p1Name === p2Name) {
        return NextResponse.json(
          { error: "Match cannot be recorded with identical players" },
          { status: 400 }
        );
      }
      const winCount = players.filter((p: any) => p.result === "win").length;
      if (winCount > 1) {
        return NextResponse.json(
          { error: "Multiplayer match cannot have more than 1 winner" },
          { status: 400 }
        );
      }
    }

    // Optional cryptographic session verification (if passed by client)
    let matchDuration = duration || 0;
    if (sessionToken && typeof sessionToken === "string") {
      const sessionVerification = await verifyAndConsumeGameSession(
        sessionToken,
        gameType,
        { action: "match" }
      );
      if (!sessionVerification.valid) {
        return NextResponse.json(
          { error: sessionVerification.error || "Invalid game session" },
          { status: sessionVerification.status || 400 }
        );
      }
      matchDuration = sessionVerification.elapsedSeconds || matchDuration;
    }

    // Auto-link user IDs if not provided & load full user models to update stats
    const userIds = players.map((p: any) => p.userId).filter(Boolean);
    const usernames = players.map((p: any) => p.username).filter(Boolean);

    const queryOr: Record<string, unknown>[] = [];
    if (userIds.length > 0) queryOr.push({ _id: { $in: userIds } });
    if (usernames.length > 0) {
      queryOr.push({
        username: {
          $in: usernames.map((name: string) => new RegExp(`^${name}$`, "i")),
        },
      });
    }

    const existingUsers = queryOr.length > 0
      ? await User.find({ $or: queryOr })
      : [];

    const userById = new Map<string, any>(
      existingUsers.map((u) => [u._id.toString(), u])
    );
    const userByName = new Map<string, any>(
      existingUsers.map((u) => [u.username.toLowerCase(), u])
    );

    const formattedPlayers = players.map((p: any) => {
      const u =
        (p.userId ? userById.get(p.userId.toString()) : null) ||
        userByName.get(p.username?.toLowerCase());
      return {
        userId: u ? u._id : p.userId || null,
        username: u ? u.username : p.username,
        score: p.score ?? 0,
        result: p.result,
      };
    });

    // Server-side duplicate match guard: Prevent saving identical match if posted within 3 seconds
    const threeSecondsAgo = new Date(Date.now() - 3000);
    const duplicateMatch = await Match.findOne({
      gameType,
      createdAt: { $gte: threeSecondsAgo },
      "players.username": { $all: usernames },
    });
    if (duplicateMatch) {
      return NextResponse.json(duplicateMatch, { status: 200 });
    }

    const match = await Match.create({
      gameType,
      players: formattedPlayers,
      duration: matchDuration,
      gameData: gameData || {},
    });

    // Update User total and wins for all participants in multiplayer/1v1 games
    for (const p of formattedPlayers) {
      const u = p.userId
        ? userById.get(p.userId.toString())
        : userByName.get(p.username?.toLowerCase());
      if (u) {
        const isWin = p.result === "win";
        if (gameType === "caro") {
          u.caroTotal = (u.caroTotal || 0) + 1;
          if (isWin) u.caroWins = (u.caroWins || 0) + 1;
        } else if (gameType === "chess") {
          u.chessTotal = (u.chessTotal || 0) + 1;
          if (isWin) u.chessWins = (u.chessWins || 0) + 1;
        } else if (gameType === "battleship") {
          u.battleshipTotal = (u.battleshipTotal || 0) + 1;
          if (isWin) u.battleshipWins = (u.battleshipWins || 0) + 1;
        } else if (gameType === "wordchain") {
          u.wordchainTotal = (u.wordchainTotal || 0) + 1;
          if (isWin) u.wordchainWins = (u.wordchainWins || 0) + 1;
        } else if (gameType === "monopoly") {
          u.monopolyTotal = (u.monopolyTotal || 0) + 1;
          if (isWin) u.monopolyWins = (u.monopolyWins || 0) + 1;
        } else if (gameType === "billiards") {
          u.billiardsTotal = (u.billiardsTotal || 0) + 1;
          if (isWin) u.billiardsWins = (u.billiardsWins || 0) + 1;
        }
        await u.save();
      }
    }

    return NextResponse.json({ match, users: existingUsers }, { status: 201 });
  } catch (error) {
    console.error("POST /api/matches error:", error);
    return NextResponse.json(
      { error: "Failed to record match" },
      { status: 500 }
    );
  }
}
