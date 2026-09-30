/**
 * Matches API route — full implementation.
 *
 * GET  /api/matches                  → List recent matches
 * GET  /api/matches?gameType=2048    → Filter by game type
 * POST /api/matches                  → Record a completed match
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Match from "@/models/Match";
import User from "@/models/User";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Mutex map to deduplicate concurrent match requests in flight
const inFlightMatchSubmissions = new Map<string, Promise<{ status: number; data: any }>>();

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
      const safeUsername = escapeRegex(username.trim());
      const targetUser = await User.findOne({
        username: { $regex: `^${safeUsername}$`, $options: "i" },
      })
        .select("_id")
        .lean();

      if (targetUser) {
        filter.$or = [
          { "players.userId": targetUser._id },
          { "players.username": { $regex: `^${safeUsername}$`, $options: "i" } },
        ];
      } else {
        filter["players.username"] = { $regex: `^${safeUsername}$`, $options: "i" };
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
          $in: usernamesToFetch,
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
      userByNameMap.set(u.username, data);
    }

    // Map each match participant to their LATEST username and avatarUrl
    const enrichedMatches = matches.map((m) => ({
      ...m,
      players: m.players.map((p) => {
        const u =
          (p.userId ? userByIdMap.get(p.userId.toString()) : null) ||
          (p.username ? userByNameMap.get(p.username) : null);
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

    const isFastArcade =
      gameType === "flappybird" ||
      gameType === "trex" ||
      gameType === "neonsnake" ||
      gameType === "blockdrop";
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
      const p1Name = (players[0].username || "").trim();
      const p2Name = (players[1].username || "").trim();
      // In production, block players from playing against themselves to farm stats
      if (process.env.NODE_ENV === "production" && p1Name && p2Name && p1Name === p2Name) {
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
    const validUserIds = players
      .map((p: any) => p.userId?.toString())
      .filter((id: any) => id && mongoose.Types.ObjectId.isValid(id));
    const usernames = players
      .map((p: any) => p.username?.toString())
      .filter(Boolean);

    const escapeRegex = (s: string) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

    const queryOr: Record<string, unknown>[] = [];
    if (validUserIds.length > 0) queryOr.push({ _id: { $in: validUserIds } });
    if (usernames.length > 0) {
      queryOr.push({
        username: {
          $in: usernames,
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
      existingUsers.map((u) => [u.username, u])
    );

    const formattedPlayers = players.map((p: any) => {
      const u =
        (p.userId && mongoose.Types.ObjectId.isValid(p.userId.toString())
          ? userById.get(p.userId.toString())
          : null) ||
        (p.username ? userByName.get(p.username) : null);
      return {
        userId: u ? u._id : (p.userId && mongoose.Types.ObjectId.isValid(p.userId.toString()) ? p.userId : null),
        username: u ? u.username : p.username,
        score: p.score ?? 0,
        result: p.result,
      };
    });

    const sanitizeUser = (u: any) => ({
      id: u._id.toString(),
      username: u.username,
      avatarUrl: u.avatarUrl || null,
      caroWins: u.caroWins ?? 0,
      caroTotal: u.caroTotal ?? 0,
      chessWins: u.chessWins ?? 0,
      chessTotal: u.chessTotal ?? 0,
      battleshipWins: u.battleshipWins ?? 0,
      battleshipTotal: u.battleshipTotal ?? 0,
      wordchainWins: u.wordchainWins ?? 0,
      wordchainTotal: u.wordchainTotal ?? 0,
      monopolyWins: u.monopolyWins ?? 0,
      monopolyTotal: u.monopolyTotal ?? 0,
      billiardsWins: u.billiardsWins ?? 0,
      billiardsTotal: u.billiardsTotal ?? 0,
    });

    const sortedUsernames = usernames
      .map((name: string) => name.trim())
      .sort()
      .join(":");

    const lockKey = gameData && gameData.roomId
      ? `${gameType}:${gameData.roomId}:${gameData.moves ?? gameData.movesCount ?? ""}`
      : `${gameType}:${sortedUsernames}:${gameData?.moves ?? gameData?.movesCount ?? ""}`;

    // If an identical match post is currently in flight, await its result to avoid duplicate DB insertions
    const existingInFlight = inFlightMatchSubmissions.get(lockKey);
    if (existingInFlight) {
      const res = await existingInFlight;
      return NextResponse.json(res.data, { status: res.status });
    }

    const submissionPromise = (async () => {
      // Server-side duplicate match guard: Prevent saving identical match if posted within 30 seconds
      const thirtySecondsAgo = new Date(Date.now() - 30_000);
      let duplicateQuery: Record<string, unknown> = {
        gameType,
        createdAt: { $gte: thirtySecondsAgo },
      };

      if (gameData && gameData.roomId) {
        duplicateQuery["gameData.roomId"] = gameData.roomId;
        if (gameData.moves !== undefined) {
          duplicateQuery["gameData.moves"] = gameData.moves;
        }
      } else {
        duplicateQuery["players.username"] = {
          $all: usernames,
        };
      }

      const duplicateMatch = await Match.findOne(duplicateQuery);
      if (duplicateMatch) {
        // Re-fetch users to get their latest saved stats from MongoDB
        const freshUsers = queryOr.length > 0 ? await User.find({ $or: queryOr }) : [];
        return {
          status: 200,
          data: { match: duplicateMatch, users: freshUsers.map(sanitizeUser) },
        };
      }

      const match = await Match.create({
        gameType,
        players: formattedPlayers,
        duration: matchDuration,
        gameData: gameData || {},
      });

      // Update User total and wins for all participants in multiplayer/1v1 games
      for (const p of formattedPlayers) {
        const u =
          (p.userId && mongoose.Types.ObjectId.isValid(p.userId.toString())
            ? userById.get(p.userId.toString())
            : null) ||
          (p.username ? userByName.get(p.username) : null);
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

      return {
        status: 201,
        data: { match, users: existingUsers.map(sanitizeUser) },
      };
    })();

    inFlightMatchSubmissions.set(lockKey, submissionPromise);
    try {
      const outcome = await submissionPromise;
      return NextResponse.json(outcome.data, { status: outcome.status });
    } finally {
      inFlightMatchSubmissions.delete(lockKey);
    }
  } catch (error) {
    console.error("POST /api/matches error:", error);
    return NextResponse.json(
      { error: "Failed to record match" },
      { status: 500 }
    );
  }
}
