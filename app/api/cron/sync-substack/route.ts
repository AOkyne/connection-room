import { NextRequest, NextResponse } from "next/server";

/**
 * Cron job to sync Substack articles daily
 * Triggered by Vercel Cron Jobs or external scheduler
 *
 * Set up in vercel.json:
 * "crons": [{
 *   "path": "/api/cron/sync-substack",
 *   "schedule": "0 8 * * *"  // Daily at 8 AM UTC
 * }]
 */

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel's cron service
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured");
    // Allow local testing without secret
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("Invalid cron authorization");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log("[Cron] Starting Substack sync...");

    // Call the sync-substack API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const syncResponse = await fetch(`${baseUrl}/api/sync-substack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!syncResponse.ok) {
      throw new Error(`Sync API returned ${syncResponse.status}`);
    }

    const result = await syncResponse.json();
    console.log("[Cron] Sync complete:", result);

    return NextResponse.json({
      success: true,
      message: "Substack sync completed",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error syncing Substack:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POST also works for manual triggering
  return GET(request);
}
