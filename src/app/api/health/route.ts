/**
 * Health check API route.
 *
 * Returns server status and basic metadata.
 * Useful for monitoring and verifying the API is live.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
}
