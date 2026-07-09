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

    const { data, error } = await supabase
      .from("profiles")
      .select("id, joined_at, completed_onboarding, profile_photo")
      .neq("role", "admin");

    if (error) throw error;

    const profiles = data || [];
    const totalMembers = profiles.length;
    const newThisWeek = profiles.filter(
      (p) => new Date(p.joined_at) > oneWeekAgo
    ).length;
    const newThisMonth = profiles.filter(
      (p) => new Date(p.joined_at) > oneMonthAgo
    ).length;
    const completedOnboarding = profiles.filter(
      (p) => p.completed_onboarding
    ).length;
    const withProfilePhoto = profiles.filter(
      (p) => p.profile_photo
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
    console.error("Error fetching member stats:", err);
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

    const { data: posts } = await supabase
      .from("posts")
      .select("id")
      .gte("created_at", oneWeekAgo.toISOString());

    const { data: comments } = await supabase
      .from("comments")
      .select("id")
      .gte("created_at", oneWeekAgo.toISOString());

    const postsThisWeek = posts?.length || 0;
    const commentsThisWeek = comments?.length || 0;

    // Reactions are stored in JSONB, so count unique reactions
    const { data: reactedPosts } = await supabase
      .from("posts")
      .select("reactions")
      .gte("created_at", oneWeekAgo.toISOString());

    let reactionsThisWeek = 0;
    (reactedPosts || []).forEach((p: any) => {
      if (p.reactions && typeof p.reactions === "object") {
        Object.values(p.reactions).forEach((count: any) => {
          reactionsThisWeek += typeof count === "number" ? count : 0;
        });
      }
    });

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
    const now = new Date();

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, status, start_at");

    if (eventsError) throw eventsError;

    const published = (events || []).filter(
      (e) => e.status === "published"
    ).length;
    const draft = (events || []).filter(
      (e) => e.status === "draft"
    ).length;
    const upcoming = (events || []).filter(
      (e) => e.status === "published" && new Date(e.start_at) > now
    ).length;

    // Get registration counts
    const { data: registrations, error: regError } = await supabase
      .from("event_registrations")
      .select("event_id");

    if (regError) throw regError;

    const registrationsByEvent = (events || [])
      .filter((e) => e.status === "published")
      .map((e) => ({
        eventId: e.id,
        title: e.title,
        count: (registrations || []).filter((r: any) => r.event_id === e.id)
          .length,
      }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count);

    const totalRegistrations = (registrations || []).length;

    return {
      totalPublished: published,
      totalDraft: draft,
      upcomingCount: upcoming,
      totalRegistrations,
      registrationsByEvent,
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
      .select("id, status, featured");

    if (error) throw error;

    const active = (offers || []).filter((o) => o.status === "active").length;
    const draft = (offers || []).filter((o) => o.status === "draft").length;
    const featured = (offers || []).filter((o) => o.featured).length;
    const total = (offers || []).length;

    return {
      totalActive: active,
      totalDraft: draft,
      featuredCount: featured,
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
    const { data: seededProfiles } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    const { data: seededPosts } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    const { data: seededComments } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    const { data: seededEvents } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    const { data: seededOffers } = await supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", true);

    // Get real counts
    const { data: realProfiles } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    const { data: realPosts } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    const { data: realComments } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    const { data: realEvents } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    const { data: realOffers } = await supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("is_seeded", false);

    return {
      seededProfiles: seededProfiles?.length || 0,
      seededPosts: seededPosts?.length || 0,
      seededComments: seededComments?.length || 0,
      seededEvents: seededEvents?.length || 0,
      seededOffers: seededOffers?.length || 0,
      realProfiles: realProfiles?.length || 0,
      realPosts: realPosts?.length || 0,
      realComments: realComments?.length || 0,
      realEvents: realEvents?.length || 0,
      realOffers: realOffers?.length || 0,
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
