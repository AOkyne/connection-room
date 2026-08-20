import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

// Full round/message content for ONE connection -- gated behind an actual
// report existing for it. This is the deliberate exception to the
// aggregate-only rule in /api/admin/connections/overview: migration 078's
// design explicitly keeps guided-exchange content private even from RLS,
// so this route re-implements that boundary at the application layer
// instead -- requireAdmin() hands back a service-role client that bypasses
// RLS entirely, so this check is the ONLY thing standing between "member
// reported this" and "admin can read what they wrote." No report row, no
// content, regardless of connection status (status can drift/revert after
// the report is filed; the report row itself is the durable authorization).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;
  const { id: connectionId } = await params;

  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select("id, reporter_id, reason, severity, status, admin_notes, created_at")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: false });

  if (reportsError) {
    return NextResponse.json({ error: reportsError.message }, { status: 500 });
  }
  if (!reports || reports.length === 0) {
    return NextResponse.json(
      { error: "This connection has not been reported. Its content is private by design and cannot be viewed." },
      { status: 403 }
    );
  }

  const [connectionResult, participantsResult, roundsResult, messagesResult] = await Promise.all([
    supabase.from("connections").select("id, user_id, partner_id, status, connection_type, created_at").eq("id", connectionId).maybeSingle(),
    supabase.from("connection_participants").select("id, user_id, invitation_status").eq("connection_id", connectionId),
    supabase
      .from("connection_rounds")
      .select("id, round_number, status, opened_at, revealed_at, prompt_id")
      .eq("connection_id", connectionId)
      .order("round_number", { ascending: true }),
    supabase
      .from("connection_messages")
      .select("id, from_user_id, from_user_name, text, created_at")
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: true }),
  ]);

  if (connectionResult.error) return NextResponse.json({ error: connectionResult.error.message }, { status: 500 });
  if (participantsResult.error) return NextResponse.json({ error: participantsResult.error.message }, { status: 500 });
  if (roundsResult.error) return NextResponse.json({ error: roundsResult.error.message }, { status: 500 });
  if (messagesResult.error) return NextResponse.json({ error: messagesResult.error.message }, { status: 500 });

  const connection = connectionResult.data;
  const participants = participantsResult.data || [];
  const rounds = roundsResult.data || [];
  const roundIds = rounds.map((r) => r.id);
  const promptIds = rounds.map((r) => r.prompt_id).filter(Boolean);

  const [responsesResult, promptsResult] = await Promise.all([
    roundIds.length > 0
      ? supabase
          .from("connection_responses")
          .select("connection_round_id, participant_id, submitted_text, submitted_at, revealed_at")
          .in("connection_round_id", roundIds)
      : Promise.resolve({ data: [], error: null }),
    promptIds.length > 0
      ? supabase.from("connection_prompts").select("id, round_number, prompt_text").in("id", promptIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (responsesResult.error) return NextResponse.json({ error: responsesResult.error.message }, { status: 500 });
  if (promptsResult.error) return NextResponse.json({ error: promptsResult.error.message }, { status: 500 });

  const userIds = new Set<string>();
  if (connection?.user_id) userIds.add(connection.user_id);
  if (connection?.partner_id) userIds.add(connection.partner_id);
  for (const p of participants) userIds.add(p.user_id);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", Array.from(userIds));
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  const nameByUserId = new Map((profiles || []).map((p) => [p.user_id as string, p.display_name || "Unnamed member"]));
  const nameByParticipantId = new Map(participants.map((p) => [p.id, nameByUserId.get(p.user_id) || "Unknown"]));
  const promptTextByRoundNumber = new Map((promptsResult.data || []).map((p) => [p.round_number, p.prompt_text]));

  const responsesByRound = new Map<string, { name: string; text: string | null; submittedAt: string | null }[]>();
  for (const r of responsesResult.data || []) {
    const list = responsesByRound.get(r.connection_round_id) || [];
    list.push({
      name: nameByParticipantId.get(r.participant_id) || "Unknown",
      text: r.submitted_text,
      submittedAt: r.submitted_at,
    });
    responsesByRound.set(r.connection_round_id, list);
  }

  return NextResponse.json({
    connection: connection
      ? {
          id: connection.id,
          status: connection.status,
          connectionType: connection.connection_type,
          createdAt: connection.created_at,
          participants: [nameByUserId.get(connection.user_id) || "Unknown", nameByUserId.get(connection.partner_id) || "Unknown"],
        }
      : null,
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      severity: r.severity,
      status: r.status,
      adminNotes: r.admin_notes,
      createdAt: r.created_at,
    })),
    rounds: rounds.map((round) => ({
      id: round.id,
      roundNumber: round.round_number,
      status: round.status,
      promptText: promptTextByRoundNumber.get(round.round_number) || null,
      revealedAt: round.revealed_at,
      responses: responsesByRound.get(round.id) || [],
    })),
    messages: (messagesResult.data || []).map((m) => ({
      id: m.id,
      fromName: m.from_user_name,
      text: m.text,
      createdAt: m.created_at,
    })),
  });
}
