import { NextRequest, NextResponse } from "next/server";
import { runPromptTick, serviceClient } from "@/lib/lento/room";

export const dynamic = "force-dynamic";

// Optional scheduler tick for the Lento Room's prompts (cron-job.org, hourly,
// Authorization: Bearer CRON_SECRET). Opening the room also publishes any
// due prompt, so this only makes timing exact on quiet days.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  const published = await runPromptTick(supabase);
  return NextResponse.json({ published });
}
