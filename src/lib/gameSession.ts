/**
 * Game Session lifecycle management & cryptographic token verification.
 *
 * Implements a HIGH-PERFORMANCE STATELESS HMAC ARCHITECTURE:
 * 1. Starting a session is 100% in-memory (ZERO database queries, < 0.001ms).
 *    Even if players die and restart 50 times/minute in Flappy Bird / T-Rex,
 *    database load is 0.
 * 2. MongoDB is ONLY written to when a high score is successfully validated & saved.
 *    At that moment, the sessionId is recorded as completed to prevent Replay Attacks.
 */

import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import GameSession from "@/models/GameSession";

const SECRET_KEY =
  process.env.GAME_SESSION_SECRET ||
  "game-portal-anticheat-secret-token-key-2026-safe";

function generateSignature(
  sessionId: string,
  startTime: number,
  gameType: string,
  userSegment: string = "guest"
): string {
  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${sessionId}:${startTime}:${gameType}:${userSegment}`)
    .digest("hex");
}

export interface IssueSessionResult {
  sessionId: string;
  sessionToken: string;
  startTime: number;
}

/**
 * Issue a new GameSession and generate an HMAC signed token.
 * 100% Stateless & In-Memory — ZERO database writes!
 */
export async function issueGameSession(
  gameType: string,
  userId?: string | null,
  _username?: string | null
): Promise<IssueSessionResult> {
  const sessionId = crypto.randomUUID();
  const startTimeMs = Date.now();
  const userSegment = userId && typeof userId === "string" ? userId : "guest";

  const signature = generateSignature(sessionId, startTimeMs, gameType, userSegment);
  const sessionToken = `${sessionId}.${startTimeMs}.${userSegment}.${signature}`;

  return {
    sessionId,
    sessionToken,
    startTime: startTimeMs,
  };
}

export interface VerifySessionResult {
  valid: boolean;
  error?: string;
  status?: number;
  elapsedSeconds?: number;
  sessionStartTime?: number;
  session?: any;
}

/**
 * Verify and consume a GameSession.
 * Validates the cryptographic HMAC in RAM, then checks MongoDB to ensure
 * the token hasn't been used yet (preventing Replay Attacks).
 */
export async function verifyAndConsumeGameSession(
  sessionToken: string,
  gameType: string,
  options?: { userId?: string; username?: string; action?: "score" | "match"; isFinal?: boolean }
): Promise<VerifySessionResult> {
  if (!sessionToken || typeof sessionToken !== "string") {
    return { valid: false, error: "Session token is required", status: 400 };
  }

  const parts = sessionToken.split(".");
  let sessionId = "";
  let startTimeMs = 0;
  let userSegment = "guest";
  let signature = "";

  if (parts.length === 4) {
    [sessionId, , userSegment, signature] = parts;
    startTimeMs = parseInt(parts[1], 10);
  } else if (parts.length === 3) {
    // Backwards compatibility with legacy 3-part tokens
    [sessionId, , signature] = parts;
    startTimeMs = parseInt(parts[1], 10);
    userSegment = "guest";
  } else {
    return { valid: false, error: "Malformed session token", status: 400 };
  }

  if (!sessionId || isNaN(startTimeMs) || !signature) {
    return { valid: false, error: "Invalid session token structure", status: 400 };
  }

  // 1. Verify HMAC signature integrity in-memory (< 0.001ms)
  const expectedSignature =
    parts.length === 4
      ? generateSignature(sessionId, startTimeMs, gameType, userSegment)
      : crypto
          .createHmac("sha256", SECRET_KEY)
          .update(`${sessionId}:${startTimeMs}:${gameType}`)
          .digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: "Invalid session signature", status: 403 };
    }
  } catch {
    return { valid: false, error: "Corrupted session signature", status: 403 };
  }

  // 2. If token was locked to a user, ensure it matches
  if (
    userSegment !== "guest" &&
    options?.userId &&
    userSegment !== options.userId
  ) {
    return {
      valid: false,
      error: "User does not match game session owner",
      status: 403,
    };
  }

  // 2.5. Prevent Token Stashing & Hoarding (Session TTL / Max-Age check)
  const now = Date.now();
  const sessionAgeMs = now - startTimeMs;
  if (startTimeMs > now + 5000) {
    return { valid: false, error: "Session token timestamp is invalid", status: 400 };
  }

  const MAX_SESSION_AGE_MS: Record<string, number> = {
    flappybird: 20 * 60 * 1000, // 20 minutes max for single run
    trex: 20 * 60 * 1000,       // 20 minutes max for single run
    aimtrainer: 15 * 60 * 1000, // 15 minutes max
    wordle: 30 * 60 * 1000,     // 30 minutes max
    minesweeper: 45 * 60 * 1000,// 45 minutes max
    sudoku: 90 * 60 * 1000,     // 90 minutes max
    pikachu: 150 * 60 * 1000,   // 2.5 hours max
    "2048": 150 * 60 * 1000,    // 2.5 hours max
    line98: 150 * 60 * 1000,    // 2.5 hours max
    neonsnake: 30 * 60 * 1000,  // 30 minutes max
  };
  const maxAllowedAge = MAX_SESSION_AGE_MS[gameType] || 120 * 60 * 1000;
  if (sessionAgeMs > maxAllowedAge) {
    return {
      valid: false,
      error: "Game session has expired. Please start a new game.",
      status: 403,
    };
  }

  const action = options?.action || "score";
  const isPikachu = gameType === "pikachu";
  const isFinal = options?.isFinal ?? (!isPikachu);

  // 3. Prevent Replay Attack via MongoDB consumed session registry
  await dbConnect();

  const claimExistingSession = async (existing: any): Promise<VerifySessionResult> => {
    if (action === "score" && existing.scoreSubmitted && (!isPikachu || existing.completed)) {
      return {
        valid: false,
        error: "Score has already been recorded for this game session",
        status: 409,
      };
    }
    if (action === "match" && existing.matchSubmitted) {
      return {
        valid: false,
        error: "Match has already been recorded for this game session",
        status: 409,
      };
    }

    // Atomically set the flag using findOneAndUpdate to prevent race condition
    const updateCond =
      action === "score"
        ? isPikachu && !existing.completed
          ? { sessionId, completed: { $ne: true } }
          : { sessionId, scoreSubmitted: { $ne: true } }
        : { sessionId, matchSubmitted: { $ne: true } };

    const updateSet =
      action === "score"
        ? {
            $set: {
              scoreSubmitted: true,
              completed: isFinal,
              completedAt: new Date(),
            },
          }
        : { $set: { matchSubmitted: true, completed: true, completedAt: new Date() } };

    const updated = await GameSession.findOneAndUpdate(updateCond, updateSet, { returnDocument: 'after' });
    if (!updated) {
      return {
        valid: false,
        error: action === "score"
          ? "Score has already been recorded for this game session"
          : "Match has already been recorded for this game session",
        status: 409,
      };
    }

    return { valid: true, session: updated };
  };

  let session = await GameSession.findOne({ sessionId });

  if (session) {
    const claimRes = await claimExistingSession(session);
    if (!claimRes.valid) return claimRes;
    session = claimRes.session;
  } else {
    // 4. First time this valid token is consumed: Record in MongoDB
    try {
      session = await GameSession.create({
        sessionId,
        userId: options?.userId || (userSegment !== "guest" ? userSegment : null),
        username: options?.username || null,
        gameType,
        startTime: new Date(startTimeMs),
        completed: isFinal,
        scoreSubmitted: action === "score",
        matchSubmitted: action === "match",
        completedAt: new Date(),
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // Race condition: another request (e.g. concurrent /api/matches and /api/users/score)
        // created the document at the exact same millisecond. Claim this action on the existing document.
        const existing = await GameSession.findOne({ sessionId });
        if (existing) {
          const claimRes = await claimExistingSession(existing);
          if (!claimRes.valid) return claimRes;
          session = claimRes.session;
        } else {
          return {
            valid: false,
            error: "Game session collision occurred",
            status: 409,
          };
        }
      } else {
        throw err;
      }
    }
  }

  // 5. Calculate server-authoritative elapsed duration
  const elapsedSeconds = Math.max(
    0,
    Math.round((now - startTimeMs) / 1000)
  );

  return {
    valid: true,
    elapsedSeconds,
    sessionStartTime: startTimeMs,
    session,
  };
}
