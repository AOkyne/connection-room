import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

// For a broadcast that got cut short (e.g. the send route hitting its
// serverless time limit partway through a large "All Members" batch --
// see app/api/admin/broadcast-email/route.ts's batching fix), this
// returns exactly the real members who do NOT yet have a sent_emails row
// for that batch -- so a follow-up send can target only the people who
// actually never got it, instead of resending to everyone (which would
// double-email whoever already received it) or requiring the admin to
// manually cross-reference Email History by hand.
export async function GET(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;
  const { batchId } = await params;

  const [profilesResult, sentResult] = await Promise.all([
    supabase.from("profiles").select("id, user_id, display_name").eq("is_seeded", false),
    supabase.from("sent_emails").select("recipient_user_id").eq("broadcast_batch_id", batchId),
  ]);

  if (profilesResult.error) {
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
  }
  if (sentResult.error) {
    return NextResponse.json({ error: sentResult.error.message }, { status: 500 });
  }

  const alreadySent = new Set((sentResult.data || []).map((r) => r.recipient_user_id).filter(Boolean));

  const unsent = (profilesResult.data || [])
    .filter((p) => p.user_id && !alreadySent.has(p.user_id))
    .map((p) => ({ id: p.id, displayName: p.display_name || "Unnamed member" }));

  return NextResponse.json({ unsent, totalMembers: (profilesResult.data || []).length, alreadySentCount: alreadySent.size });
}
