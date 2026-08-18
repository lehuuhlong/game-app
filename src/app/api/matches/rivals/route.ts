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

    const matches = await Match.find({
      "players.username": { $regex: `^${username}$`, $options: "i" },
      "players.1": { $exists: true }, // multiplayer matches (at least 2 players)
    })
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    const rivalMap: Record<
      string,
      {
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
      const myRecord = m.players.find(
        (p) => p.username.toLowerCase() === username.toLowerCase()
      );
      if (!myRecord) return;

      const opponents = m.players.filter(
        (p) => p.username.toLowerCase() !== username.toLowerCase()
      );

      opponents.forEach((opp) => {
        const oppKey = opp.username.toLowerCase();
        if (!rivalMap[oppKey]) {
          rivalMap[oppKey] = {
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

    const rivalUsernames = Object.values(rivalMap).map((r) => r.username);
    const users = await User.find({ username: { $in: rivalUsernames } })
      .select("username avatarUrl")
      .lean();

    const avatarMap = new Map<string, string | null>(
      users.map((u) => [u.username.toLowerCase(), u.avatarUrl || null])
    );

    const rivals = Object.values(rivalMap)
      .map((r) => ({
        username: r.username,
        avatarUrl: avatarMap.get(r.username.toLowerCase()) || null,
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
      }))
      .sort((a, b) => b.totalMatches - a.totalMatches || b.wins - a.wins);

    return NextResponse.json({
      username,
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
