import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

interface CampaignRow {
  broadcast_batch_id: string | null;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
}

export interface BroadcastCampaign {
  batchId: string;
  subject: string;
  sentAt: string;
  totalSent: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
}

// PostgREST (the Supabase JS client) has no GROUP BY -- every broadcast
// send fans out into one sent_emails row per recipient (same
// broadcast_batch_id, migration 095), so grouping happens here in JS
// instead of in the query. Broadcasts only, and only ones with a batch id
// (older rows sent before this feature shipped have none and are simply
// not campaigns to group).
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("sent_emails")
    .select("broadcast_batch_id, subject, sent_at, opened_at, clicked_at")
    .eq("category", "broadcast")
    .not("broadcast_batch_id", "is", null)
    .order("sent_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as CampaignRow[];
  const byBatch = new Map<
    string,
    { subject: string; sentAt: string; totalSent: number; uniqueOpens: number; uniqueClicks: number }
  >();

  for (const row of rows) {
    const batchId = row.broadcast_batch_id;
    if (!batchId) continue;
    const existing = byBatch.get(batchId);
    if (existing) {
      existing.totalSent += 1;
      if (row.opened_at) existing.uniqueOpens += 1;
      if (row.clicked_at) existing.uniqueClicks += 1;
      if (row.sent_at < existing.sentAt) existing.sentAt = row.sent_at;
    } else {
      byBatch.set(batchId, {
        subject: row.subject,
        sentAt: row.sent_at,
        totalSent: 1,
        uniqueOpens: row.opened_at ? 1 : 0,
        uniqueClicks: row.clicked_at ? 1 : 0,
      });
    }
  }

  const campaigns: BroadcastCampaign[] = Array.from(byBatch.entries())
    .map(([batchId, c]) => ({
      batchId,
      subject: c.subject,
      sentAt: c.sentAt,
      totalSent: c.totalSent,
      uniqueOpens: c.uniqueOpens,
      uniqueClicks: c.uniqueClicks,
      openRate: c.totalSent > 0 ? c.uniqueOpens / c.totalSent : 0,
      clickRate: c.totalSent > 0 ? c.uniqueClicks / c.totalSent : 0,
    }))
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
    .slice(0, 25);

  return NextResponse.json({ campaigns });
}
