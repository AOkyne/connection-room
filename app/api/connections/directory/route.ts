import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { buildProfilePhotoUrl } from "@/lib/utils/storage";

export const dynamic = "force-dynamic";

// A real browsable directory, not a shuffled 5-person sample like
// /api/matching/find -- everything eligible is fetched once (this app's
// scale makes a single bounded round trip perfectly fine, per the plan's
// "a simple recommendation query is sufficient" instruction) and then
// filtered/sorted/paginated in JS, mirroring matching/find's existing
// "score in JS, keep private fields server-side" shape rather than
// inventing a new one.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, userId } = auth;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "everyone";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = 24;

  const PROFILE_SCORING_COLUMNS =
    "user_id, interests, location, created_at, suspended, suspended_at, deactivated_at, spaces_joined";

  const [selfResult, candidatesResult, blocksResult] = await Promise.all([
    supabase.from("profiles").select(PROFILE_SCORING_COLUMNS).eq("user_id", userId).single(),
    // completed_onboarding + a real photo are the same "is this a real,
    // presentable member" bar matching/find already uses.
    supabase
      .from("profiles")
      .select(PROFILE_SCORING_COLUMNS)
      .neq("user_id", userId)
      .eq("completed_onboarding", true)
      .or("profile_photo_path.not.is.null,profile_photo.neq."),
    // The connection_blocks table (migration 078) is the real,
    // server-enforced block list -- unlike matching/find (which only
    // trusts a client-supplied blockedUserIds array), a NEW directory
    // route can and should query it directly.
    supabase
      .from("connection_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
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

  const blockedUserIds = new Set(
    (blockRows || []).map((b) => (b.blocker_id === userId ? b.blocked_id : b.blocker_id))
  );

  // Suspended (admin action, migration 058) and deactivated (self-service,
  // migration 062) members are excluded here explicitly -- neither is
  // checked anywhere else in the app's matching/discovery code today
  // (confirmed: matching/find has no suspended check at all).
  const eligibleCandidates = (candidates || []).filter((p) => {
    if (blockedUserIds.has(p.user_id)) return false;
    if (p.suspended || p.suspended_at) return false;
    if (p.deactivated_at) return false;
    return true;
  });

  if (eligibleCandidates.length === 0) {
    return NextResponse.json({ members: [], hasMore: false });
  }

  // public_profiles_view masks every field per the candidate's own show_*
  // flags -- show_in_discovery=false is a hard exclusion (member opted out
  // of being found at all), the rest is what's actually shown on a card.
  const { data: viewRows, error: viewError } = await supabase
    .from("public_profiles_view")
    .select(
      "user_id, display_name, profile_photo_path, profile_photo, tagline, location, interests, age_range, why_joined, connection_intentions, profile_visibility, spaces_joined, show_in_discovery, member_since"
    )
    .in(
      "user_id",
      eligibleCandidates.map((c) => c.user_id)
    )
    .eq("show_in_discovery", true);

  if (viewError) {
    return NextResponse.json({ error: "Failed to load member profiles" }, { status: 500 });
  }

  const selfSpaces = new Set(Array.isArray(selfRow.spaces_joined) ? selfRow.spaces_joined : []);
  const candidateByUserId = new Map(eligibleCandidates.map((c) => [c.user_id, c]));

  let visible = (viewRows || []).filter((v) => {
    if (v.profile_visibility === "hidden") return false;
    if (v.profile_visibility === "shared_spaces") {
      const candidateSpaces: string[] = Array.isArray(v.spaces_joined) ? v.spaces_joined : [];
      return candidateSpaces.some((s) => selfSpaces.has(s));
    }
    return true;
  });

  const selfInterests: string[] = Array.isArray(selfRow.interests) ? selfRow.interests : [];
  const sharedInterestCount = (candidateInterests: unknown): number => {
    if (!Array.isArray(candidateInterests)) return 0;
    return selfInterests.filter((i) => candidateInterests.some((ci) => String(ci).toLowerCase() === i.toLowerCase()))
      .length;
  };

  // "Los Angeles, CA" vs. a candidate's plain "Los Angeles" (or "LA",
  // "Los Angeles CA" with no comma) are the same real city but were never
  // exactly equal as full strings -- confirmed live: an LA-based viewer's
  // "Near Me" tab returned members from Austin, DC, and Indiana with no
  // visible LA-based prioritization at all, because the previous
  // comparison required byte-for-byte equality of the whole location
  // string. Comparing just the part before the first comma (trimmed,
  // lowercased) is a much more forgiving "same city" match given these
  // are freeform text fields, not a structured city/state pair.
  const cityOf = (location: string | null | undefined): string =>
    (location || "").split(",")[0].trim().toLowerCase();

  let nearMeUnavailable = false;
  if (filter === "near_me") {
    const selfCity = cityOf(selfRow.location);
    if (!selfCity) {
      // Nothing to sort by -- surfaced to the client so the UI can say so
      // explicitly instead of silently showing the same order as "Everyone"
      // with no indication the filter didn't actually do anything.
      nearMeUnavailable = true;
    } else {
      visible = [...visible].sort((a, b) => {
        const aMatch = cityOf(a.location) === selfCity ? 1 : 0;
        const bMatch = cityOf(b.location) === selfCity ? 1 : 0;
        return bMatch - aMatch;
      });
    }
  } else if (filter === "new_members") {
    visible = [...visible].sort((a, b) => {
      const aCreated = candidateByUserId.get(a.user_id)?.created_at || "";
      const bCreated = candidateByUserId.get(b.user_id)?.created_at || "";
      return bCreated.localeCompare(aCreated);
    });
  } else if (filter === "shared_interests") {
    visible = [...visible].sort((a, b) => sharedInterestCount(b.interests) - sharedInterestCount(a.interests));
  }
  // "everyone" (default): natural order from the query, no re-sort.

  const total = visible.length;
  const start = (page - 1) * pageSize;
  const pageRows = visible.slice(start, start + pageSize);

  const members = pageRows.map((v) => ({
    id: v.user_id,
    displayName: v.display_name || "A member",
    profilePhoto: v.profile_photo_path ? buildProfilePhotoUrl(v.profile_photo_path) : v.profile_photo || "",
    ageRange: v.age_range || null,
    location: v.location || null,
    tagline: v.tagline || v.why_joined || null,
    interests: Array.isArray(v.interests) ? v.interests.slice(0, 4) : [],
    connectionIntentions: Array.isArray(v.connection_intentions) ? v.connection_intentions : [],
    sharedInterestCount: sharedInterestCount(v.interests),
  }));

  return NextResponse.json({ members, hasMore: start + pageSize < total, total, nearMeUnavailable });
}
