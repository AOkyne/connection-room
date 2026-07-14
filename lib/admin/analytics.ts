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

    const { data: result, error: err, status } = await supabase
      .from("profiles")
      .select("id, created_at, completed_onboarding, profile_photo, is_demo_profile")
      .eq("is_demo_profile", false)
      .order("created_at", { ascending: false });

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

    // Get active members this week
    const { data: activePosts } = await supabase
      .from("posts")
      .select("user_id")
      .gte("created_at", oneWeekAgo.toISOString());

    const { data: activeComments } = await supabase
      .from("comments")
      .select("user_id")
      .gte("created_at", oneWeekAgo.toISOString());

    const activeIds = new Set<string>();
    (activePosts || []).forEach((p: any) => activeIds.add(p.user_id));
    (activeComments || []).forEach((c: any) => activeIds.add(c.user_id));

    const activeThisWeek = activeIds.size;

    // Get active members this month
    const { data: activePostsMonth } = await supabase
      .from("posts")
      .select("user_id")
      .gte("created_at", oneMonthAgo.toISOString());

    const { data: activeCommentsMonth } = await supabase
      .from("comments")
      .select("user_id")
      .gte("created_at", oneMonthAgo.toISOString());

    const activeIdsMonth = new Set<string>();
    (activePostsMonth || []).forEach((p: any) => activeIdsMonth.add(p.user_id));
    (activeCommentsMonth || []).forEach((c: any) =>
      activeIdsMonth.add(c.user_id)
    );

    const activeThisMonth = activeIdsMonth.size;

    // Count completed onboarding and profile photos
    const completedOnboarding = profiles.filter((p: any) => p.completed_onboarding).length;
    const withProfilePhoto = profiles.filter((p: any) => p.profile_photo).length;

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

    // Get real members (exclude demo)
    const { data: realMembers } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_demo_profile", false);

    const realMemberIds = new Set((realMembers || []).map((m: any) => m.id));

    // Get posts from real members only
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, user_id")
      .gte("created_at", oneWeekAgo.toISOString());

    const realPosts = (posts || []).filter((p: any) => realMemberIds.has(p.user_id));

    // Get comments from real members only
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("id, user_id")
      .gte("created_at", oneWeekAgo.toISOString());

    const realComments = (comments || []).filter((c: any) => realMemberIds.has(c.user_id));

    // Get reactions from real members only
    const { data: reactions, error: reactionsError } = await supabase
      .from("reactions")
      .select("id, user_id")
      .gte("created_at", oneWeekAgo.toISOString());

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
    const { data: spaces, error: spacesError } = await supabase
      .from("spaces")
      .select("id, name, member_count");

    if (spacesError) throw spacesError;

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats: SpaceStats[] = [];

    for (const space of spaces || []) {
      const { data: posts } = await supabase
        .from("posts")
        .select("id, created_at")
        .eq("space_id", space.id);

      const { data: comments } = await supabase
        .from("comments")
        .select("id, created_at")
        .in(
          "post_id",
          (posts || []).map((p) => p.id)
        );

      const activeThisWeek = [
        ...(posts || [])
          .filter((p) => new Date(p.created_at) > oneWeekAgo)
          .map((p) => p.id),
        ...(comments || [])
          .filter((c) => new Date(c.created_at) > oneWeekAgo)
          .map((c) => c.id),
      ].length;

      const lastActivityPost = (posts || []).sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )[0];

      stats.push({
        spaceId: space.id,
        spaceName: space.name,
        memberCount: space.member_count || 0,
        postCount: (posts || []).length,
        commentCount: (comments || []).length,
        lastActivity: lastActivityPost?.created_at,
        activeThisWeek,
      });
    }

    return stats.sort((a, b) => b.postCount - a.postCount);
  } catch (err) {
    console.error("Error fetching space stats:", err);
    return [];
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
