/**
 * GET /api/matches/rivals?username=Alice
 *
 * Returns list of rivals for a given user, aggregated from all multiplayer matches:
 * - rival username & avatar
 * - total matches played together
 * - head-to-head record (wins, losses, draws)
 * - win rate vs that rival
 * - last played date
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Match from "@/models/Match";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return NextResponse.json(
        { error: "username query parameter is required" },
        { status: 400 }
      );
    }

    const targetUser = await User.findOne({
      username,
    })
      .select("_id username")
      .lean();

    const matchQuery: Record<string, unknown> = {
      "players.1": { $exists: true }, // multiplayer matches (at least 2 players)
    };

    if (targetUser) {
      matchQuery.$or = [
        { "players.userId": targetUser._id },
        { "players.username": username },
      ];
    } else {
      matchQuery["players.username"] = username;
    }

    const matches = await Match.find(matchQuery)
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    const isMe = (p: any) =>
      (targetUser && p.userId?.toString() === targetUser._id.toString()) ||
      p.username === username;

    const rivalMap: Record<
      string,
      {
        userId: string | null;
        username: string;
        totalMatches: number;
        wins: number;
        losses: number;
        draws: number;
        lastPlayed: Date;
        games: Set<string>;
      }
    > = {};

    matches.forEach((m) => {
      const myRecord = m.players.find(isMe);
      if (!myRecord) return;

      const opponents = m.players.filter((p) => !isMe(p));

      opponents.forEach((opp) => {
        const oppKey = opp.userId ? opp.userId.toString() : opp.username;
        if (!rivalMap[oppKey]) {
          rivalMap[oppKey] = {
            userId: opp.userId ? opp.userId.toString() : null,
            username: opp.username,
            totalMatches: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            lastPlayed: m.createdAt,
            games: new Set(),
          };
        }

        const rival = rivalMap[oppKey];
        rival.totalMatches += 1;
        rival.games.add(m.gameType);

        if (myRecord.result === "win") {
          rival.wins += 1;
        } else if (opp.result === "win" || myRecord.result === "loss") {
          rival.losses += 1;
        } else {
          rival.draws += 1;
        }

        if (new Date(m.createdAt) > new Date(rival.lastPlayed)) {
          rival.lastPlayed = m.createdAt;
        }
      });
    });

    const rivalUserIds = Object.values(rivalMap)
      .map((r) => r.userId)
      .filter(Boolean) as string[];
    const rivalUsernames = Object.values(rivalMap).map((r) => r.username);

    const queryOr: Record<string, unknown>[] = [];
    if (rivalUserIds.length > 0) {
      queryOr.push({ _id: { $in: rivalUserIds } });
    }
    if (rivalUsernames.length > 0) {
      queryOr.push({
        username: {
          $in: rivalUsernames.map((name) => new RegExp(`^${name}$`, "i")),
        },
      });
    }

    const users = queryOr.length > 0
      ? await User.find({ $or: queryOr })
          .select("_id username avatarUrl")
          .lean()
      : [];

    const userById = new Map<string, { username: string; avatarUrl: string | null }>();
    const userByName = new Map<string, { username: string; avatarUrl: string | null }>();
    for (const u of users) {
      const data = { username: u.username, avatarUrl: u.avatarUrl || null };
      userById.set(u._id.toString(), data);
      userByName.set(u.username, data);
    }

    const rivals = Object.values(rivalMap)
      .map((r) => {
        const u =
          (r.userId ? userById.get(r.userId) : null) ||
          userByName.get(r.username);
        const finalUsername = u ? u.username : r.username;
        const finalAvatar = u ? u.avatarUrl : null;

        return {
          username: finalUsername,
          avatarUrl: finalAvatar,
          totalMatches: r.totalMatches,
          wins: r.wins,
          losses: r.losses,
          draws: r.draws,
          winRate:
            r.totalMatches > 0
              ? Math.round((r.wins / r.totalMatches) * 100)
              : 0,
          lastPlayed: r.lastPlayed,
          games: Array.from(r.games),
        };
      })
      .sort((a, b) => b.totalMatches - a.totalMatches || b.wins - a.wins);

    return NextResponse.json({
      username: targetUser ? targetUser.username : username,
      totalRivals: rivals.length,
      rivals,
    });
  } catch (error) {
    console.error("GET /api/matches/rivals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rivals" },
      { status: 500 }
    );
  }
}
