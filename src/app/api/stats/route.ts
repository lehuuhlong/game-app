/**
 * GET /api/stats
 *
 * Returns aggregate site stats for the homepage:
 * - totalPlayers: number of registered users
 * - bestScore2048: highest bestScore2048 across all users
 * - caroMatches: total Caro games played (sum of caroTotal)
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export const revalidate = 60; // Cache for 60 seconds on Vercel

export async function GET() {
  try {
    await dbConnect();

    const [totalPlayers, best2048Agg, caroAgg] = await Promise.all([
      User.countDocuments(),
      User.findOne({ bestScore2048: { $gt: 0 } })
        .select("bestScore2048")
        .sort({ bestScore2048: -1 })
        .lean(),
      User.aggregate([
        { $group: { _id: null, total: { $sum: "$caroTotal" } } },
      ]),
    ]);

    return NextResponse.json({
      totalPlayers,
      bestScore2048: (best2048Agg as any)?.bestScore2048 ?? 0,
      caroMatches: caroAgg[0]?.total ?? 0,
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { totalPlayers: 0, bestScore2048: 0, caroMatches: 0 },
      { status: 200 } // Return zeros rather than error to avoid breaking the UI
    );
  }
}
