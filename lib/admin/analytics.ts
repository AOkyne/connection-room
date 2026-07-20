import { supabase } from "@/lib/supabase/client";

export interface MemberStats {
  totalMembers: number;
  newThisWeek: number;
  newThisMonth: number;
  completedOnboarding: number;
  withProfilePhoto: number;
  activeThisWeek: number;
  activeThisMonth: number;
}

export interface ActivityStats {
  postsThisWeek: number;
  commentsThisWeek: number;
  reactionsThisWeek: number;
  activeMembers: string[];
}

export interface SpaceStats {
  spaceId: string;
  spaceName: string;
  memberCount: number;
  postCount: number;
  commentCount: number;
  lastActivity?: string;
  activeThisWeek: number;
}

export interface MemberTypeBreakdown {
  individual: number;
  partneredIndividual: number;
  couple: number;
  other: number;
}

export interface EventStats {
  totalPublished: number;
  totalDraft: number;
  upcomingCount: number;
  totalRegistrations: number;
  registrationsByEvent: Array<{
    eventId: string;
    title: string;
    count: number;
  }>;
}

export interface OfferStats {
  totalActive: number;
  totalDraft: number;
  featuredCount: number;
  totalOffers: number;
}

export interface SeededContentStats {
  seededProfiles: number;
  seededPosts: number;
  seededComments: number;
  seededEvents: number;
  seededOffers: number;
  realProfiles: number;
  realPosts: number;
  realComments: number;
  realEvents: number;
  realOffers: number;
}

// Get member statistics
export async function getMemberStats(): Promise<MemberStats> {
  if (!supabase) {
    return {
      totalMembers: 0,
      newThisWeek: 0,
      newThisMonth: 0,
      completedOnboarding: 0,
      withProfilePhoto: 0,
      activeThisWeek: 0,
      activeThisMonth: 0,
    };
  }

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // profile_photo stores the image itself as base64 text directly in the
    // row -- some are multiple megabytes. Selecting it here (this function
    // only ever needed a truthy/falsy check, never the actual image) made
    // this a genuinely slow query: sorting and transferring tens of
    // megabytes of image text for ~46 rows measured at 11+ seconds
    // in isolation, well past Postgres's statement timeout under any
    // concurrent load. Fetch it as a separate, row-data-free COUNT instead.
    const [{ data: result, error: err, status }, { count: withPhotoCount }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, created_at, completed_onboarding, is_seeded")
        .eq("is_seeded", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_seeded", false)
        // Migration 064: a migrated member's "has a photo" signal now
        // lives in profile_photo_path, not the legacy column.
        .or("profile_photo_path.not.is.null,profile_photo.not.is.null"),
    ]);

    if (err) {
      console.error("getMemberStats error details:", { status, err, message: err?.message });
      throw err;
    }

    console.log("📊 Member Stats - Real profiles fetched:", result?.length || 0);

    const profiles = result || [];
    const totalMembers = profiles.length;
    const newThisWeek = profiles.filter(
      (p) => new Date(p.created_at) > oneWeekAgo
    ).length;
    const newThisMonth = profiles.filter(
      (p) => new Date(p.created_at) > oneMonthAgo
    ).length;

    // One month-scoped fetch each for posts/comments (in parallel), then
    // derive "this week" as a subset client-side, instead of 4 separate
    // sequential queries (week posts, week comments, month posts, month
    // comments) -- the week window is always inside the month window, so
    // there's no need to ask the database twice.
    const [{ data: activePostsMonth }, { data: activeCommentsMonth }] = await Promise.all([
      supabase.from("posts").select("user_id, created_at").gte("created_at", oneMonthAgo.toISOString()),
      supabase.from("comments").select("user_id, created_at").gte("created_at", oneMonthAgo.toISOString()),
    ]);

    const activeIds = new Set<string>();
    (activePostsMonth || [])
      .filter((p: any) => new Date(p.created_at) > oneWeekAgo)
      .forEach((p: any) => activeIds.add(p.user_id));
    (activeCommentsMonth || [])
      .filter((c: any) => new Date(c.created_at) > oneWeekAgo)
      .forEach((c: any) => activeIds.add(c.user_id));

    const activeThisWeek = activeIds.size;

    const activeIdsMonth = new Set<string>();
    (activePostsMonth || []).forEach((p: any) => activeIdsMonth.add(p.user_id));
    (activeCommentsMonth || []).forEach((c: any) =>
      activeIdsMonth.add(c.user_id)
    );

    const activeThisMonth = activeIdsMonth.size;

    // Count completed onboarding and profile photos
    const completedOnboarding = profiles.filter((p: any) => p.completed_onboarding).length;
    const withProfilePhoto = withPhotoCount || 0;

    console.log("📊 Analytics:", { totalMembers, newThisWeek, activeThisWeek, completedOnboarding, withProfilePhoto });

    return {
      totalMembers,
      newThisWeek,
      newThisMonth,
      completedOnboarding,
      withProfilePhoto,
      activeThisWeek,
      activeThisMonth,
    };
  } catch (err) {
    console.error("Error fetching member stats:", err, JSON.stringify(err));
    return {
      totalMembers: 0,
      newThisWeek: 0,
      newThisMonth: 0,
      completedOnboarding: 0,
      withProfilePhoto: 0,
      activeThisWeek: 0,
      activeThisMonth: 0,
    };
  }
}

// Get activity statistics
export async function getActivityStats(): Promise<ActivityStats> {
  if (!supabase) {
    return {
      postsThisWeek: 0,
      commentsThisWeek: 0,
      reactionsThisWeek: 0,
      activeMembers: [],
    };
  }

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get real members (exclude demo). Fetched (and everything below)
    // in parallel rather than four sequential round-trips.
    const [
      { data: realMembers },
      { data: posts, error: postsError },
      { data: comments, error: commentsError },
      { data: reactions, error: reactionsError },
    ] = await Promise.all([
      supabase.from("profiles").select("user_id").eq("is_seeded", false),
      supabase.from("posts").select("id, user_id").gte("created_at", oneWeekAgo.toISOString()),
      supabase.from("comments").select("id, user_id").gte("created_at", oneWeekAgo.toISOString()),
      supabase.from("reactions").select("id, user_id").gte("created_at", oneWeekAgo.toISOString()),
    ]);

    // posts/comments/reactions.user_id all reference auth.users(id) directly
    // -- i.e. profiles.user_id, NOT profiles.id (a separate, generated row
    // UUID). This previously built the set from profiles.id, so it could
    // essentially never match a real post/comment/reaction author -- Posts
    // & Responses and Community Activity showed 0 regardless of how much
    // real activity existed, the exact bug reported.
    const realMemberIds = new Set((realMembers || []).map((m: any) => m.user_id));

    const realPosts = (posts || []).filter((p: any) => realMemberIds.has(p.user_id));
    const realComments = (comments || []).filter((c: any) => realMemberIds.has(c.user_id));
    const realReactions = (reactions || []).filter((r: any) => realMemberIds.has(r.user_id));

    if (postsError || commentsError || reactionsError) {
      console.error("Activity stats errors:", { postsError, commentsError, reactionsError });
    }

    const postsThisWeek = realPosts.length;
    const commentsThisWeek = realComments.length;
    const reactionsThisWeek = realReactions.length;

    console.log("📈 Activity Stats (Real Members Only):", { postsThisWeek, commentsThisWeek, reactionsThisWeek });

    return {
      postsThisWeek,
      commentsThisWeek,
      reactionsThisWeek,
      activeMembers: [],
    };
  } catch (err) {
    console.error("Error fetching activity stats:", err);
    return {
      postsThisWeek: 0,
      commentsThisWeek: 0,
      reactionsThisWeek: 0,
      activeMembers: [],
    };
  }
}

// Get space statistics
export async function getSpaceStats(): Promise<SpaceStats[]> {
  if (!supabase) return [];

  try {
    // spaces has no member_count column (never existed -- a prior version
    // of this function queried it directly and silently returned [] on
    // every call as a result, since the query itself errored). member
    // counts come from space_memberships instead, same as
    // getMemberCountBySpace() in lib/data/profiles.ts.
    const { data: spaces, error: spacesError } = await supabase
      .from("spaces")
      .select("id, name");

    if (spacesError) throw spacesError;

    // One bulk query for every post/comment, grouped client-side by space,
    // instead of 2 queries per space in a loop (was up to ~26 sequential
    // round-trips across ~13 spaces -- the dominant cause of the admin
    // dashboard's slow load, since this function previously errored
    // instantly on the missing member_count column and so never actually
    // ran this loop until that was fixed).
    const [{ data: memberships }, { data: allPosts }] = await Promise.all([
      supabase.from("space_memberships").select("space_id"),
      supabase.from("posts").select("id, space_id, created_at"),
    ]);

    const membershipCounts = new Map<string, number>();
    (memberships || []).forEach((m: any) => {
      membershipCounts.set(m.space_id, (membershipCounts.get(m.space_id) || 0) + 1);
    });

    const { data: allComments } = await supabase
      .from("comments")
      .select("id, post_id, created_at")
      .in("post_id", (allPosts || []).map((p: any) => p.id));

    const postIdToSpaceId = new Map((allPosts || []).map((p: any) => [p.id, p.space_id]));

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats: SpaceStats[] = (spaces || []).map((space) => {
      const posts = (allPosts || []).filter((p: any) => p.space_id === space.id);
      const comments = (allComments || []).filter(
        (c: any) => postIdToSpaceId.get(c.post_id) === space.id
      );

      const activeThisWeek = [
        ...posts.filter((p: any) => new Date(p.created_at) > oneWeekAgo).map((p: any) => p.id),
        ...comments.filter((c: any) => new Date(c.created_at) > oneWeekAgo).map((c: any) => c.id),
      ].length;

      const lastActivityPost = [...posts].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return {
        spaceId: space.id,
        spaceName: space.name,
        memberCount: membershipCounts.get(space.id) || 0,
        postCount: posts.length,
        commentCount: comments.length,
        lastActivity: lastActivityPost?.created_at,
        activeThisWeek,
      };
    });

    return stats.sort((a, b) => b.memberCount - a.memberCount);
  } catch (err) {
    console.error("Error fetching space stats:", err);
    return [];
  }
}

// Get member type breakdown (real members only, excludes seeded/demo)
export async function getMemberTypeBreakdown(): Promise<MemberTypeBreakdown> {
  const empty: MemberTypeBreakdown = { individual: 0, partneredIndividual: 0, couple: 0, other: 0 };
  if (!supabase) return empty;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("member_type")
      .eq("is_seeded", false);

    if (error) throw error;

    return (data || []).reduce((acc, p: any) => {
      switch (p.member_type) {
        case "individual":
          acc.individual++;
          break;
        case "partnered-individual":
          acc.partneredIndividual++;
          break;
        case "couple":
          acc.couple++;
          break;
        default:
          acc.other++;
      }
      return acc;
    }, { ...empty });
  } catch (err) {
    console.error("Error fetching member type breakdown:", err);
    return empty;
  }
}

// Get event statistics
export async function getEventStats(): Promise<EventStats> {
  if (!supabase) {
    return {
      totalPublished: 0,
      totalDraft: 0,
      upcomingCount: 0,
      totalRegistrations: 0,
      registrationsByEvent: [],
    };
  }

  try {
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id");

    if (eventsError) throw eventsError;

    const totalPublished = (events || []).length;

    return {
      totalPublished,
      totalDraft: 0,
      upcomingCount: 0,
      totalRegistrations: 0,
      registrationsByEvent: [],
    };
  } catch (err) {
    console.error("Error fetching event stats:", err);
    return {
      totalPublished: 0,
      totalDraft: 0,
      upcomingCount: 0,
      totalRegistrations: 0,
      registrationsByEvent: [],
    };
  }
}

// Get offer statistics
export async function getOfferStats(): Promise<OfferStats> {
  if (!supabase) {
    return {
      totalActive: 0,
      totalDraft: 0,
      featuredCount: 0,
      totalOffers: 0,
    };
  }

  try {
    const { data: offers, error } = await supabase
      .from("offers")
      .select("id");

    if (error) throw error;

    const total = (offers || []).length;

    return {
      totalActive: total,
      totalDraft: 0,
      featuredCount: 0,
      totalOffers: total,
    };
  } catch (err) {
    console.error("Error fetching offer stats:", err);
    return {
      totalActive: 0,
      totalDraft: 0,
      featuredCount: 0,
      totalOffers: 0,
    };
  }
}

// Get seeded content statistics (for post-launch cleanup)
export async function getSeededContentStats(): Promise<SeededContentStats> {
  if (!supabase) {
    return {
      seededProfiles: 0,
      seededPosts: 0,
      seededComments: 0,
      seededEvents: 0,
      seededOffers: 0,
      realProfiles: 0,
      realPosts: 0,
      realComments: 0,
      realEvents: 0,
      realOffers: 0,
    };
  }

  try {
    // Get seeded counts
    const { count: seededProfilesCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    const { count: seededPostsCount } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    const { count: seededCommentsCount } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    const { count: seededEventsCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    const { count: seededOffersCount } = await supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    // Get real counts
    const { count: realProfilesCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    const { count: realPostsCount } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    const { count: realCommentsCount } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    const { count: realEventsCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    const { count: realOffersCount } = await supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    return {
      seededProfiles: seededProfilesCount || 0,
      seededPosts: seededPostsCount || 0,
      seededComments: seededCommentsCount || 0,
      seededEvents: seededEventsCount || 0,
      seededOffers: seededOffersCount || 0,
      realProfiles: realProfilesCount || 0,
      realPosts: realPostsCount || 0,
      realComments: realCommentsCount || 0,
      realEvents: realEventsCount || 0,
      realOffers: realOffersCount || 0,
    };
  } catch (err) {
    console.error("Error fetching seeded content stats:", err);
    return {
      seededProfiles: 0,
      seededPosts: 0,
      seededComments: 0,
      seededEvents: 0,
      seededOffers: 0,
      realProfiles: 0,
      realPosts: 0,
      realComments: 0,
      realEvents: 0,
      realOffers: 0,
    };
  }
}
