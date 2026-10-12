/**
 * POST /api/games/session
 *
 * Issues a cryptographic HMAC-signed Game Session token when a player starts a game.
 * Rate limited to prevent session generation flooding.
 */

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { issueGameSession } from "@/lib/gameSession";

const VALID_GAMES = [
  "2048",
  "caro",
  "minesweeper",
  "wordle",
  "trex",
  "flappybird",
  "wordchain",
  "sudoku",
  "chess",
  "aimtrainer",
  "battleship",
  "monopoly",
  "pikachu",
  "line98",
  "billiards",
  "neonsnake",
  "blockdrop",
  "eggpop",
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { gameType, userId, username } = body;

    if (!gameType || !VALID_GAMES.includes(gameType)) {
      return NextResponse.json(
        { error: "Invalid or missing gameType" },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    const isFastArcade =
      gameType === "flappybird" ||
      gameType === "trex" ||
      gameType === "neonsnake" ||
      gameType === "blockdrop" ||
      gameType === "eggpop";
    const limit = isFastArcade ? 120 : 60;
    const rateCheck = checkRateLimit(`session_start:${clientIp}`, limit, 60_000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many game sessions started. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
      );
    }

    const sessionData = await issueGameSession(gameType, userId, username);

    return NextResponse.json(sessionData, { status: 201 });
  } catch (error) {
    console.error("POST /api/games/session error:", error);
    return NextResponse.json(
      { error: "Failed to initialize game session" },
      { status: 500 }
    );
  }
}
