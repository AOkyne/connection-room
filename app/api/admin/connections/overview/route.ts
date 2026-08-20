import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

// Aggregate-only: counts, stuck-round flags, live-session stats, and a
// recent-activity list with participant NAMES -- but never any round
// prompt/response text or chat message content. This is deliberate: the
// Guided Exchange system (migration 078) was built so draft/submitted
// text is never visible to anyone but the two participants, not even via
// RLS. Full content for a specific connection is only ever available
// through /api/admin/connections/[id]/content, and only once a member has
// actually filed a report on it -- see that route for the gate.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;

  const [connectionsResult, roundsResult, liveSessionsResult, reportsResult] = await Promise.all([
    supabase
      .from("connections")
      .select("id, user_id, partner_id, status, connection_type, current_round_number, created_at, activated_at, response_deadline_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("connection_rounds")
      .select("id, connection_id, round_number, response_deadline_at")
      .eq("status", "open")
      .lt("response_deadline_at", new Date().toISOString())
      .order("response_deadline_at", { ascending: true })
      .limit(200),
    supabase
      .from("connection_live_sessions")
      .select("id, connection_id, status, scheduled_start_at")
      .order("scheduled_start_at", { ascending: true, nullsFirst: false })
      .limit(200),
    supabase.from("reports").select("id, connection_id, status").not("connection_id", "is", null),
  ]);

  if (connectionsResult.error) {
    return NextResponse.json({ error: connectionsResult.error.message }, { status: 500 });
  }
  if (roundsResult.error) {
    return NextResponse.json({ error: roundsResult.error.message }, { status: 500 });
  }
  if (liveSessionsResult.error) {
    return NextResponse.json({ error: liveSessionsResult.error.message }, { status: 500 });
  }
  if (reportsResult.error) {
    return NextResponse.json({ error: reportsResult.error.message }, { status: 500 });
  }

  const connections = connectionsResult.data || [];
  const stuckRounds = roundsResult.data || [];
  const liveSessions = liveSessionsResult.data || [];
  const reports = reportsResult.data || [];

  // Every user_id/partner_id referenced anywhere above, batched into one
  // profiles lookup so the response can show real names instead of UUIDs.
  const userIds = new Set<string>();
  for (const c of connections) {
    if (c.user_id) userIds.add(c.user_id);
    if (c.partner_id) userIds.add(c.partner_id);
  }
  const connectionById = new Map(connections.map((c) => [c.id, c]));
  for (const round of stuckRounds) {
    const c = connectionById.get(round.connection_id);
    if (c) {
      if (c.user_id) userIds.add(c.user_id);
      if (c.partner_id) userIds.add(c.partner_id);
    }
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", Array.from(userIds));

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const nameByUserId = new Map((profiles || []).map((p) => [p.user_id as string, p.display_name || "Unnamed member"]));
  const namesFor = (connectionId: string): [string, string] => {
    const c = connectionById.get(connectionId);
    if (!c) return ["Unknown", "Unknown"];
    return [nameByUserId.get(c.user_id) || "Unknown", nameByUserId.get(c.partner_id) || "Unknown"];
  };

  const statusCounts: Record<string, number> = {};
  for (const c of connections) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  }

  const reportedConnectionIds = new Set(reports.filter((r) => r.status !== "resolved").map((r) => r.connection_id));

  return NextResponse.json({
    totalConnections: connections.length,
    statusCounts,
    pendingReportsCount: reports.filter((r) => r.status !== "resolved").length,
    stuckRounds: stuckRounds.map((round) => {
      const [nameA, nameB] = namesFor(round.connection_id);
      return {
        connectionId: round.connection_id,
        roundNumber: round.round_number,
        deadlineMissedAt: round.response_deadline_at,
        participants: [nameA, nameB],
      };
    }),
    liveSessions: {
      counts: liveSessions.reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {}),
      upcoming: liveSessions
        .filter((s) => s.status === "scheduled" && s.scheduled_start_at)
        .map((s) => {
          const [nameA, nameB] = namesFor(s.connection_id);
          return { connectionId: s.connection_id, scheduledStartAt: s.scheduled_start_at, participants: [nameA, nameB] };
        }),
    },
    recent: connections.slice(0, 50).map((c) => ({
      id: c.id,
      participants: namesFor(c.id),
      status: c.status,
      connectionType: c.connection_type,
      currentRoundNumber: c.current_round_number,
      createdAt: c.created_at,
      isReported: reportedConnectionIds.has(c.id),
    })),
  });
}
