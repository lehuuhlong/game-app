/**
 * Users API route — full CRUD implementation.
 *
 * GET  /api/users          → List users (paginated)
 * GET  /api/users?q=name   → Search by username
 * POST /api/users          → Create a new user
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    // Build query filter
    const filter = q
      ? { username: { $regex: q, $options: "i" } }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-__v")
        .sort({ "stats.totalScore": -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { username, email } = body;

    if (!username || !email) {
      return NextResponse.json(
        { error: "username and email are required" },
        { status: 400 }
      );
    }

    // Check for existing user
    const existing = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username or email already exists" },
        { status: 409 }
      );
    }

    const user = await User.create({
      username,
      email,
      avatarUrl: body.avatarUrl || null,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
