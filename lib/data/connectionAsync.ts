// Data-access layer for Async Guided Connections (migration 078+).
//
// Every mutation here calls a SECURITY DEFINER Postgres RPC rather than
// writing to a table directly -- the RPCs are what make the reveal/
// acceptance race conditions safe (see migration 078's own comments), and
// they're also where all authorization actually lives; nothing here should
// be treated as a trust boundary, it's a thin typed wrapper only.
//
// Kept as its own module rather than folded into lib/data/connections.ts --
// that file owns the legacy live-chat `connections` table access patterns
// (mapConnectionRow, createConfirmedConnection, etc.) and this is a parallel,
// mostly-non-overlapping surface built on the same `connections` table plus
// the new tables from migration 078.

import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";
import { getPublicProfile } from "./profiles";
import type {
  AsyncConnection,
  AsyncConnectionStatus,
  ConnectionRound,
  RoundResponseView,
  ConnectionAcknowledgment,
  AcknowledgmentType,
  LiveSession,
  ConnectionFormat,
} from "@/lib/types/connection";

function rpcError(context: string, error: unknown): null {
  console.error(`[connectionAsync] ${context}:`, error);
  return null;
}

// ---------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------

export interface CreateInvitationResult {
  connectionId: string | null;
  // Human-readable reason for a failure -- the RPC raises a real
  // exception for "already blocked" / "already have an open connection
  // with this person" / not-authenticated, which previously vanished
  // entirely (console.error only, nothing shown to the member clicking
  // the button -- confirmed live: looked exactly like the button just
  // didn't do anything).
  error: string | null;
}

export async function createConnectionInvitation(
  toUserId: string,
  options: { connectionType?: "async" | "live"; sharedPrompt?: string; promptSequenceId?: string } = {}
): Promise<CreateInvitationResult> {
  if (!supabase) return { connectionId: null, error: "Connections are not available right now." };

  try {
    const { data, error } = await demoSafeWrite(
      () =>
        supabase!.rpc("create_connection_invitation", {
          p_to_user_id: toUserId,
          p_connection_type: options.connectionType || "async",
          p_prompt_sequence_id: options.promptSequenceId || "00000000-0000-4000-8000-000000000001",
          p_shared_prompt: options.sharedPrompt || null,
        }),
      { context: "createConnectionInvitation" }
    );

    if (error) {
      rpcError("createConnectionInvitation", error);
      return { connectionId: null, error: error.message || "Could not send this invitation." };
    }
    return { connectionId: data as string, error: null };
  } catch (err) {
    rpcError("createConnectionInvitation", err);
    return { connectionId: null, error: err instanceof Error ? err.message : "Could not send this invitation." };
  }
}

export async function acceptConnectionInvitation(connectionId: string): Promise<AsyncConnectionStatus | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("accept_connection_invitation", { p_connection_id: connectionId });
  if (error) return rpcError("acceptConnectionInvitation", error);
  return data as AsyncConnectionStatus;
}

export async function declineConnectionInvitation(connectionId: string, reasonPrivate?: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("decline_connection_invitation", {
    p_connection_id: connectionId,
    p_reason_private: reasonPrivate || null,
  });
  if (error) {
    rpcError("declineConnectionInvitation", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// Dashboard / detail reads
// ---------------------------------------------------------------------

// Maps a `connections` row (joined with the caller's own
// connection_participants row) into the AsyncConnection shape the UI
// expects, resolving the partner's public profile the same way
// mapConnectionRow() does in lib/data/connections.ts for the legacy table.
async function mapAsyncConnectionRow(row: any, viewerId: string): Promise<AsyncConnection> {
  const viewerIsOwner = row.user_id === viewerId;
  const partnerId = viewerIsOwner ? row.partner_id : row.user_id;
  const myParticipant = (row.connection_participants || []).find((p: any) => p.user_id === viewerId);

  let partnerName = viewerIsOwner ? row.partner_name : "Member";
  let partnerPhoto = viewerIsOwner ? row.partner_photo || "" : "";

  if (!viewerIsOwner) {
    const profile = await getPublicProfile(partnerId);
    partnerName = profile?.displayName || "Member";
    partnerPhoto = profile?.profilePhoto || "";
  }

  return {
    id: row.id,
    status: row.status,
    connectionType: row.connection_type,
    currentRoundNumber: row.current_round_number,
    invitationExpiresAt: row.invitation_expires_at ? new Date(row.invitation_expires_at) : undefined,
    activatedAt: row.activated_at ? new Date(row.activated_at) : undefined,
    responseDeadlineAt: row.response_deadline_at ? new Date(row.response_deadline_at) : undefined,
    extensionUsedAt: row.extension_used_at ? new Date(row.extension_used_at) : undefined,
    liveRequestedAt: row.live_requested_at ? new Date(row.live_requested_at) : undefined,
    createdAt: new Date(row.created_at),
    partnerId,
    partnerName,
    partnerPhoto,
    myParticipantId: myParticipant?.id || "",
    myInvitationStatus: myParticipant?.invitation_status || "invited",
    sharedPrompt: row.shared_prompt || undefined,
  };
}

const CONNECTION_SELECT = "*, connection_participants(id, user_id, invitation_status)";

// A member who isn't on the async beta list must still be able to see and
// respond to an async invitation someone else sends them -- otherwise it's
// a one-way trap: the inviter sees it as sent, the recipient's whole
// Connections page renders as pure legacy UI and the invitation is
// invisible to them, with no way to accept, decline, or even know it
// exists. Confirmed live: exactly this happened. Callers should OR this
// with the feature flag itself (isAsyncConnectionsEnabled) rather than
// using it alone, so the flag still controls whether someone can
// *initiate* new guided connections while this only ever widens access
// for someone who's already been invited into one.
export async function hasAnyAsyncConnectionActivity(userId: string): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("connections")
    .select("id")
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .eq("connection_type", "async")
    .limit(1);

  if (error) {
    rpcError("hasAnyAsyncConnectionActivity", error);
    return false;
  }
  return (data || []).length > 0;
}

export async function getMyAsyncConnections(userId: string): Promise<AsyncConnection[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("connections")
    .select(CONNECTION_SELECT)
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    rpcError("getMyAsyncConnections", error);
    return [];
  }

  return Promise.all((data || []).map((row) => mapAsyncConnectionRow(row, userId)));
}

export async function getAsyncConnection(connectionId: string, userId: string): Promise<AsyncConnection | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("connections")
    .select(CONNECTION_SELECT)
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !data) return rpcError("getAsyncConnection", error);
  return mapAsyncConnectionRow(data, userId);
}

function mapRoundRow(row: any): ConnectionRound {
  const prompt = row.connection_prompts;
  return {
    id: row.id,
    connectionId: row.connection_id,
    roundNumber: row.round_number,
    status: row.status,
    promptText: prompt?.prompt_text || "",
    followUpPrompt: prompt?.follow_up_prompt || undefined,
    responseCharacterLimit: prompt?.response_character_limit || 2000,
    openedAt: new Date(row.opened_at),
    responseDeadlineAt: new Date(row.response_deadline_at),
    revealedAt: row.revealed_at ? new Date(row.revealed_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  };
}

export async function getConnectionRounds(connectionId: string): Promise<ConnectionRound[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("connection_rounds")
    .select("*, connection_prompts(prompt_text, follow_up_prompt, response_character_limit)")
    .eq("connection_id", connectionId)
    .order("round_number", { ascending: true });

  if (error) {
    rpcError("getConnectionRounds", error);
    return [];
  }

  return (data || []).map(mapRoundRow);
}

export async function getCurrentRound(connectionId: string, currentRoundNumber: number): Promise<ConnectionRound | null> {
  if (!supabase || currentRoundNumber < 1) return null;

  const { data, error } = await supabase
    .from("connection_rounds")
    .select("*, connection_prompts(prompt_text, follow_up_prompt, response_character_limit)")
    .eq("connection_id", connectionId)
    .eq("round_number", currentRoundNumber)
    .maybeSingle();

  if (error || !data) return null;
  return mapRoundRow(data);
}

// One connection has at most one non-completed round at a time (the next
// round only opens once the previous one is marked 'completed' by
// advance_round()), so filtering status IN ('open','revealed') per
// connection_id reliably identifies "the current round" without needing to
// join against connections.current_round_number. Used by the dashboard to
// tell "waiting for you" / "waiting for them" / "ready to reveal" apart
// without a per-connection round fetch (see GuidedExchangeSection.tsx).
export interface CurrentRoundState {
  connectionId: string;
  roundId: string;
  roundStatus: "open" | "revealed";
  mySubmitted: boolean;
}

export async function getCurrentRoundStates(connectionIds: string[], viewerId: string): Promise<CurrentRoundState[]> {
  if (!supabase || connectionIds.length === 0) return [];

  const { data: rounds, error: roundsError } = await supabase
    .from("connection_rounds")
    .select("id, connection_id, status")
    .in("connection_id", connectionIds)
    .in("status", ["open", "revealed"]);

  if (roundsError || !rounds || rounds.length === 0) return [];

  const { data: participants, error: participantsError } = await supabase
    .from("connection_participants")
    .select("id, connection_id")
    .in("connection_id", connectionIds)
    .eq("user_id", viewerId);

  if (participantsError || !participants) return [];

  const myParticipantIdByConnection = new Map(participants.map((p) => [p.connection_id, p.id]));
  const myParticipantIds = participants.map((p) => p.id);

  const { data: responses, error: responsesError } = await supabase
    .from("connection_responses")
    .select("connection_round_id, participant_id, submitted_at")
    .in("connection_round_id", rounds.map((r) => r.id))
    .in("participant_id", myParticipantIds);

  if (responsesError) return [];

  const submittedByRound = new Map((responses || []).map((r) => [r.connection_round_id, !!r.submitted_at]));

  return rounds.map((r) => ({
    connectionId: r.connection_id,
    roundId: r.id,
    roundStatus: r.status as "open" | "revealed",
    mySubmitted: submittedByRound.get(r.id) || false,
  }));
}

// ---------------------------------------------------------------------
// Round responses
// ---------------------------------------------------------------------

export async function saveResponseDraft(roundId: string, draftText: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("save_response_draft", { p_round_id: roundId, p_draft_text: draftText });
  if (error) {
    rpcError("saveResponseDraft", error);
    return false;
  }
  return true;
}

// My own draft is a normal owner-scoped SELECT (RLS allows it directly),
// unlike the counterpart's response which must go through
// getRoundResponses() below.
export interface MyRoundResponseState {
  text: string;
  isSubmitted: boolean;
}

// Distinguishes "this is a draft you can still edit" from "you already
// submitted this" -- the caller previously only got a bare string, so a
// round that's still 'open' only because the OTHER participant hasn't
// answered yet (not because you haven't) looked identical to one you'd
// never touched: same editable textarea, same enabled Submit button,
// your already-submitted text just sitting there with no indication
// anything had happened. Confirmed live.
export async function getMyDraft(roundId: string, myParticipantId: string): Promise<MyRoundResponseState> {
  if (!supabase) return { text: "", isSubmitted: false };
  const { data, error } = await supabase
    .from("connection_responses")
    .select("draft_text, submitted_text")
    .eq("connection_round_id", roundId)
    .eq("participant_id", myParticipantId)
    .maybeSingle();

  if (error || !data) return { text: "", isSubmitted: false };
  if (data.submitted_text) return { text: data.submitted_text, isSubmitted: true };
  return { text: data.draft_text || "", isSubmitted: false };
}

export type SubmitRoundResult = "revealed" | "waiting_for_participant";

export async function submitRoundResponse(roundId: string, text: string): Promise<SubmitRoundResult | null> {
  if (!supabase) return null;
  const { data, error } = await demoSafeWrite(
    () => supabase!.rpc("submit_round_response", { p_round_id: roundId, p_text: text }),
    { context: "submitRoundResponse" }
  );
  if (error) return rpcError("submitRoundResponse", error);
  return data as SubmitRoundResult;
}

export async function getRoundResponses(roundId: string): Promise<RoundResponseView[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_round_responses", { p_round_id: roundId });
  if (error) {
    rpcError("getRoundResponses", error);
    return [];
  }
  return (data || []).map((r: any) => ({
    participantId: r.participant_id,
    isMine: r.is_mine,
    submittedText: r.submitted_text,
    submittedAt: r.submitted_at ? new Date(r.submitted_at) : null,
    revealedAt: r.revealed_at ? new Date(r.revealed_at) : null,
    viewedAt: r.viewed_at ? new Date(r.viewed_at) : null,
    advancedAt: r.advanced_at ? new Date(r.advanced_at) : null,
  }));
}

export async function markResponseViewed(roundId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("mark_response_viewed", { p_round_id: roundId });
  if (error) rpcError("markResponseViewed", error);
}

export async function submitAcknowledgment(
  roundId: string,
  acknowledgmentType: AcknowledgmentType,
  acknowledgmentText?: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("submit_acknowledgment", {
    p_round_id: roundId,
    p_acknowledgment_type: acknowledgmentType,
    p_acknowledgment_text: acknowledgmentText || null,
  });
  if (error) {
    rpcError("submitAcknowledgment", error);
    return false;
  }
  return true;
}

export async function getAcknowledgments(roundId: string): Promise<ConnectionAcknowledgment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("connection_acknowledgments")
    .select("*")
    .eq("connection_round_id", roundId);

  if (error) {
    rpcError("getAcknowledgments", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    connectionRoundId: row.connection_round_id,
    fromParticipantId: row.from_participant_id,
    acknowledgmentType: row.acknowledgment_type,
    acknowledgmentText: row.acknowledgment_text || undefined,
    createdAt: new Date(row.created_at),
  }));
}

export type AdvanceRoundResult = "waiting_for_participant" | "exchange_complete" | "next_round_open";

export async function advanceRound(roundId: string): Promise<AdvanceRoundResult | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("advance_round", { p_round_id: roundId });
  if (error) return rpcError("advanceRound", error);
  return data as AdvanceRoundResult;
}

// ---------------------------------------------------------------------
// Deadlines, ending, reporting
// ---------------------------------------------------------------------

export async function extendConnectionDeadline(connectionId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("extend_connection_deadline", { p_connection_id: connectionId });
  if (error) {
    rpcError("extendConnectionDeadline", error);
    return false;
  }
  return true;
}

export async function endAsyncConnection(connectionId: string, reasonPrivate?: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("end_connection", {
    p_connection_id: connectionId,
    p_reason_private: reasonPrivate || null,
  });
  if (error) {
    rpcError("endAsyncConnection", error);
    return false;
  }
  return true;
}

export async function reportAsyncConnection(
  connectionId: string,
  reason: string,
  severity: "low" | "medium" | "high" = "medium"
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("report_connection", {
    p_connection_id: connectionId,
    p_reason: reason,
    p_severity: severity,
  });
  if (error) {
    rpcError("reportAsyncConnection", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// Live conversation: request/respond/schedule/join/ready/end
// ---------------------------------------------------------------------

export async function requestLiveConversation(connectionId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("request_live_conversation", { p_connection_id: connectionId });
  if (error) {
    rpcError("requestLiveConversation", error);
    return false;
  }
  return true;
}

export async function respondToLiveRequest(
  connectionId: string,
  action: "accept" | "decline" | "continue_async"
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("respond_live_request", { p_connection_id: connectionId, p_action: action });
  if (error) {
    rpcError("respondToLiveRequest", error);
    return false;
  }
  return true;
}

export async function submitLiveAvailability(
  connectionId: string,
  startsAt: Date,
  endsAt: Date,
  timezone: string
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("submit_live_availability", {
    p_connection_id: connectionId,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_timezone: timezone,
  });
  if (error) return rpcError("submitLiveAvailability", error);
  return data as string;
}

export async function getConnectionAvailability(connectionId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("connection_availability")
    .select("*")
    .eq("connection_id", connectionId);

  if (error) {
    rpcError("getConnectionAvailability", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    participantId: row.participant_id,
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    timezone: row.timezone,
  }));
}

export async function confirmLiveSlot(connectionId: string, startsAt: Date): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("confirm_live_slot", {
    p_connection_id: connectionId,
    p_starts_at: startsAt.toISOString(),
  });
  if (error) return rpcError("confirmLiveSlot", error);
  return data as string;
}

export async function getLiveSession(connectionId: string): Promise<LiveSession | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("connection_live_sessions")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    connectionId: data.connection_id,
    status: data.status,
    scheduledStartAt: data.scheduled_start_at ? new Date(data.scheduled_start_at) : undefined,
    actualStartedAt: data.actual_started_at ? new Date(data.actual_started_at) : undefined,
    endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
    durationSeconds: data.duration_seconds || undefined,
  };
}

export async function getLiveSessionParticipants(sessionId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("connection_live_session_participants")
    .select("*")
    .eq("live_session_id", sessionId);

  if (error) return [];
  return (data || []).map((row: any) => ({
    participantId: row.participant_id,
    joinedAt: row.joined_at ? new Date(row.joined_at) : undefined,
    readyAt: row.ready_at ? new Date(row.ready_at) : undefined,
    leftAt: row.left_at ? new Date(row.left_at) : undefined,
  }));
}

export async function joinLiveSession(sessionId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("join_live_session", { p_session_id: sessionId });
  if (error) {
    rpcError("joinLiveSession", error);
    return false;
  }
  return true;
}

export type MarkReadyResult = "started" | "waiting_for_participant";

export async function markLiveReady(sessionId: string): Promise<MarkReadyResult | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("mark_live_ready", { p_session_id: sessionId });
  if (error) return rpcError("markLiveReady", error);
  return data as MarkReadyResult;
}

export async function endLiveSession(sessionId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("end_live_session", { p_session_id: sessionId });
  if (error) {
    rpcError("endLiveSession", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// "Available now" -- explicit, self-expiring, never inferred from presence.
// ---------------------------------------------------------------------

export async function setLiveAvailabilityNow(durationMinutes: 15 | 30 | 60): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("set_live_availability_now", { p_duration_minutes: durationMinutes });
  if (error) {
    rpcError("setLiveAvailabilityNow", error);
    return false;
  }
  return true;
}

export async function clearLiveAvailabilityNow(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("clear_live_availability_now");
  if (error) {
    rpcError("clearLiveAvailabilityNow", error);
    return false;
  }
  return true;
}

export async function getMyLiveAvailability(userId: string): Promise<{ availableUntil: Date; durationMinutes: number } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("connection_live_availability")
    .select("available_until, duration_minutes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const availableUntil = new Date(data.available_until);
  if (availableUntil.getTime() <= Date.now()) return null; // expired -- treat as absent
  return { availableUntil, durationMinutes: data.duration_minutes };
}

// ---------------------------------------------------------------------
// Preferences: format multi-select, real backend (see connections.ts note).
// ---------------------------------------------------------------------

export async function getConnectionFormats(userId: string): Promise<ConnectionFormat[]> {
  if (!supabase) return ["guided_message"];
  const { data, error } = await supabase
    .from("connection_preferences")
    .select("formats")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return ["guided_message"];
  return (data.formats || ["guided_message"]) as ConnectionFormat[];
}

export async function updateConnectionFormats(userId: string, formats: ConnectionFormat[]): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await demoSafeWrite(
    () =>
      supabase!
        .from("connection_preferences")
        .upsert({ user_id: userId, formats, updated_at: new Date().toISOString() }, { onConflict: "user_id" }),
    { context: "updateConnectionFormats" }
  );
  if (error) {
    rpcError("updateConnectionFormats", error);
    return false;
  }
  return true;
}
