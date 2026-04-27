/**
 * Single User API route.
 *
 * GET    /api/users/[id]  → Get user by ID
 * PATCH  /api/users/[id]  → Update user stats/scores
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const user = await User.findById(id).select("-__v").lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    // Build the update object — only allow specific fields
    const update: Record<string, unknown> = {};

    if (body.avatarUrl !== undefined) {
      update.avatarUrl = body.avatarUrl;
    }

    // Increment stats
    if (body.incrementGamesPlayed) {
      update.$inc = {
        ...((update.$inc as Record<string, number>) || {}),
        "stats.gamesPlayed": 1,
      };
    }
    if (body.incrementGamesWon) {
      update.$inc = {
        ...((update.$inc as Record<string, number>) || {}),
        "stats.gamesWon": 1,
      };
    }
    if (body.addScore) {
      update.$inc = {
        ...((update.$inc as Record<string, number>) || {}),
        "stats.totalScore": body.addScore,
      };
    }

    // Update best scores (only if higher)
    if (body.bestScore2048 !== undefined) {
      const user = await User.findById(id).lean();
      if (user && body.bestScore2048 > (user.bestScores?.["2048"] || 0)) {
        update["bestScores.2048"] = body.bestScore2048;
      }
    }
    if (body.bestScoreCaro !== undefined) {
      const user = await User.findById(id).lean();
      if (user && body.bestScoreCaro > (user.bestScores?.caro || 0)) {
        update["bestScores.caro"] = body.bestScoreCaro;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, update, {
      new: true,
      select: "-__v",
    }).lean();

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
