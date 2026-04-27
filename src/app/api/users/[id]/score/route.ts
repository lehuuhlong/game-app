/**
 * PATCH /api/users/[id]/score
 *
 * 2048: only updates bestScore2048 if new score is higher.
 * Caro: increments caroTotal, and caroWins if won=true.
 *
 * Body (2048): { game: "2048", score: number }
 * Body (caro): { game: "caro", won: boolean }
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
    const { game } = body;

    if (!game || !["2048", "caro"].includes(game)) {
      return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (game === "2048") {
      const { score } = body;
      if (typeof score !== "number" || score < 0) {
        return NextResponse.json({ error: "Invalid score" }, { status: 400 });
      }
      // Only keep best score
      if (score > user.bestScore2048) {
        user.bestScore2048 = score;
      }
    } else if (game === "caro") {
      const { won } = body;
      user.caroTotal += 1;
      if (won === true) user.caroWins += 1;
    }

    await user.save();

    return NextResponse.json({
      bestScore2048: user.bestScore2048,
      caroWins: user.caroWins,
      caroTotal: user.caroTotal,
    });
  } catch (error) {
    console.error("PATCH /api/users/[id]/score error:", error);
    return NextResponse.json(
      { error: "Failed to update score" },
      { status: 500 }
    );
  }
}
