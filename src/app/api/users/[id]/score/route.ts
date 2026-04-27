/**
 * PATCH /api/users/[id]/score
 *
 * Updates a user's best score for a specific game and increments gamesPlayed.
 * Only updates bestScore if the new score is higher than the existing one.
 *
 * Body: { game: "2048" | "caro", score: number }
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { game, score } = body;

    if (!game || !["2048", "caro"].includes(game)) {
      return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
    }
    if (typeof score !== "number" || score < 0) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Increment gamesPlayed and totalScore
    user.stats.gamesPlayed += 1;
    user.stats.totalScore += score;

    // Only update bestScore if this run is better
    const currentBest = user.bestScores[game as "2048" | "caro"] || 0;
    if (score > currentBest) {
      user.bestScores[game as "2048" | "caro"] = score;
    }

    await user.save();

    return NextResponse.json({
      bestScores: user.bestScores,
      stats: user.stats,
    });
  } catch (error) {
    console.error("PATCH /api/users/[id]/score error:", error);
    return NextResponse.json(
      { error: "Failed to update score" },
      { status: 500 }
    );
  }
}
