/**
 * PATCH /api/users/[id]/avatar
 *
 * Updates a user's avatar URL (base64 data URL or external URL).
 * Body: { avatarUrl: string }
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
    const { avatarUrl } = await request.json();

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
    }

    // Limit size (base64 images can be large; cap at ~1 MB)
    if (avatarUrl.length > 1_400_000) {
      return NextResponse.json(
        { error: "Image too large. Please use an image under 1 MB." },
        { status: 413 }
      );
    }

    await dbConnect();
    const user = await User.findByIdAndUpdate(
      id,
      { avatarUrl },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ avatarUrl: user.avatarUrl });
  } catch (error) {
    console.error("PATCH /api/users/[id]/avatar error:", error);
    return NextResponse.json(
      { error: "Failed to update avatar" },
      { status: 500 }
    );
  }
}
