import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { buildProfilePhotoUrl } from "@/lib/utils/storage";

export const dynamic = "force-dynamic";

// "Someone You Might Want to Know" / "Your Connection of the Week" --
// backed by the same eligibility rules as /api/connections/directory
// (blocked, suspended, deactivated, show_in_discovery, visibility), plus
// two more exclusions specific to a recommendation: someone the viewer is
// already talking to, and someone recently dismissed via "Not this one"
// (connection_suggestion_dismissals, migration 097). Scoring is simple and
// explainable on purpose (shared interests/spaces/connection_intentions
// overlap) -- no ML, per the plan.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, userId } = auth;

  const { searchParams } = new URL(request.url);
  const weekly = searchParams.get("weekly") === "true";

  const PROFILE_COLUMNS = "user_id, interests, spaces_joined, suspended, suspended_at, deactivated_at";

  const [selfResult, candidatesResult, blocksResult, existingConnResult, dismissalsResult] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("user_id", userId).single(),
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .neq("user_id", userId)
      .eq("completed_onboarding", true)
      .or("profile_photo_path.not.is.null,profile_photo.neq."),
    supabase.from("connection_blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    // Anyone the viewer already has a non-terminal connection with -- a
    // recommendation shouldn't suggest someone they're already talking to.
    // Terminal statuses are filtered in JS below, not in this query, to
    // avoid relying on PostgREST's .not(col, "in", "(...)") string syntax.
    supabase
      .from("connections")
      .select("user_id, partner_id, status")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`),
    // Only a recent dismissal excludes -- "not this one" isn't forever,
    // it just means "not right now" (30 days).
    supabase
      .from("connection_suggestion_dismissals")
      .select("dismissed_user_id, dismissed_at")
      .eq("user_id", userId)
      .gte("dismissed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const { data: selfRow, error: selfError } = selfResult;
  if (selfError || !selfRow) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: candidates, error: candidatesError } = candidatesResult;
  if (candidatesError) {
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }

  const { data: blockRows, error: blocksError } = blocksResult;
  if (blocksError) {
    return NextResponse.json({ error: "Failed to load block list" }, { status: 500 });
  }

  const { data: existingConns, error: existingConnError } = existingConnResult;
  if (existingConnError) {
    return NextResponse.json({ error: "Failed to load existing conversations" }, { status: 500 });
  }

  const { data: dismissals, error: dismissalsError } = dismissalsResult;
  if (dismissalsError) {
    return NextResponse.json({ error: "Failed to load dismissals" }, { status: 500 });
  }

  const TERMINAL_STATUSES = new Set(["declined", "expired", "ended", "cancelled", "completed"]);
  const blockedUserIds = new Set((blockRows || []).map((b) => (b.blocker_id === userId ? b.blocked_id : b.blocker_id)));
  const alreadyTalkingTo = new Set(
    (existingConns || [])
      .filter((c) => !TERMINAL_STATUSES.has(c.status))
      .map((c) => (c.user_id === userId ? c.partner_id : c.user_id))
  );
  const dismissedUserIds = new Set((dismissals || []).map((d) => d.dismissed_user_id));

  const eligibleCandidates = (candidates || []).filter((p) => {
    if (blockedUserIds.has(p.user_id)) return false;
    if (alreadyTalkingTo.has(p.user_id)) return false;
    if (dismissedUserIds.has(p.user_id)) return false;
    if (p.suspended || p.suspended_at) return false;
    if (p.deactivated_at) return false;
    return true;
  });

  if (eligibleCandidates.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const { data: viewRows, error: viewError } = await supabase
    .from("public_profiles_view")
    .select(
      "user_id, display_name, profile_photo_path, profile_photo, location, interests, connection_intentions, why_joined, profile_visibility, spaces_joined, show_in_discovery"
    )
    .in("user_id", eligibleCandidates.map((c) => c.user_id))
    .eq("show_in_discovery", true);

  if (viewError) {
    return NextResponse.json({ error: "Failed to load member profiles" }, { status: 500 });
  }

  const selfSpaces = new Set(Array.isArray(selfRow.spaces_joined) ? selfRow.spaces_joined : []);
  const selfInterests: string[] = Array.isArray(selfRow.interests) ? selfRow.interests : [];

  const visible = (viewRows || []).filter((v) => {
    if (v.profile_visibility === "hidden") return false;
    if (v.profile_visibility === "shared_spaces") {
      const candidateSpaces: string[] = Array.isArray(v.spaces_joined) ? v.spaces_joined : [];
      return candidateSpaces.some((s) => selfSpaces.has(s));
    }
    return true;
  });

  if (visible.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const scored = visible
    .map((v) => {
      const candidateInterests: string[] = Array.isArray(v.interests) ? v.interests : [];
      const sharedInterests = selfInterests.filter((i) =>
        candidateInterests.some((ci) => ci.toLowerCase() === i.toLowerCase())
      );
      const candidateSpaces: string[] = Array.isArray(v.spaces_joined) ? v.spaces_joined : [];
      const sharedSpaceCount = candidateSpaces.filter((s) => selfSpaces.has(s)).length;
      const score = sharedInterests.length * 3 + sharedSpaceCount * 2;
      return { row: v, sharedInterests, sharedSpaceCount, score };
    })
    .sort((a, b) => b.score - a.score);

  const buildReason = (s: (typeof scored)[number]): string => {
    if (s.sharedInterests.length > 0) {
      return `You both share an interest in ${s.sharedInterests.slice(0, 2).join(" and ")}.`;
    }
    if (s.sharedSpaceCount > 0) {
      return "You're both part of the same space.";
    }
    return "A member you haven't connected with yet.";
  };

  const toSuggestion = (s: (typeof scored)[number]) => ({
    id: s.row.user_id,
    displayName: s.row.display_name || "A member",
    profilePhoto: s.row.profile_photo_path ? buildProfilePhotoUrl(s.row.profile_photo_path) : s.row.profile_photo || "",
    reason: buildReason(s),
  });

  if (weekly) {
    // Deterministic per (user, ISO week) so the same pick holds for the
    // whole week and only changes when the pool changes or the week
    // rolls over -- not a random pick on every page load.
    const now = new Date();
    const isoYear = now.getUTCFullYear();
    const jan1 = new Date(Date.UTC(isoYear, 0, 1));
    const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
    const isoWeek = Math.ceil((dayOfYear + jan1.getUTCDay() + 1) / 7);
    const weekKey = `${isoYear}-W${isoWeek}`;
    const hashInput = `${userId}:${weekKey}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      hash = (hash * 31 + hashInput.charCodeAt(i)) >>> 0;
    }
    const index = hash % scored.length;
    return NextResponse.json({ suggestions: [toSuggestion(scored[index])] });
  }

  return NextResponse.json({ suggestions: scored.slice(0, 3).map(toSuggestion) });
}
