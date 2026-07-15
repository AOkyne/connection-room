import { ConnectionInterest, ConnectionMilestone, ConnectionPracticeSummary } from "@/lib/types/connection";
import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";

const CONNECTION_INTERESTS_KEY = "connection-room:connection-interests";
const CONNECTION_MILESTONES_KEY = "connection-room:connection-milestones";

// Get current user ID
async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === "undefined" || !supabase) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

// Connection Interests
export async function saveConnectionInterest(interest: ConnectionInterest): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getCurrentUserId();
  const client = supabase;
  if (userId && client) {
    try {
      await demoSafeWrite(
        () => client.from("connection_interests").insert({
          user_id: userId,
          theme: interest.theme,
          space_id: interest.spaceId,
          prompt_id: interest.promptId,
          source_type: interest.sourceType,
        }),
        { context: "saveConnectionInterest" }
      );
    } catch (error) {
      console.warn("Error saving connection interest to Supabase:", error);
      // Fall back to localStorage
      const interests = JSON.parse(localStorage.getItem(CONNECTION_INTERESTS_KEY) || "[]");
      interests.push({ ...interest, userId });
      localStorage.setItem(CONNECTION_INTERESTS_KEY, JSON.stringify(interests));
    }
  } else {
    // Demo mode: save to localStorage
    const interests = JSON.parse(localStorage.getItem(CONNECTION_INTERESTS_KEY) || "[]");
    interests.push({ ...interest, userId: userId || "demo-user" });
    localStorage.setItem(CONNECTION_INTERESTS_KEY, JSON.stringify(interests));
  }
}

export async function getConnectionInterests(userId: string): Promise<ConnectionInterest[]> {
  if (typeof window === "undefined") return [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("connection_interests")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        theme: item.theme,
        spaceId: item.space_id,
        promptId: item.prompt_id,
        sourceType: item.source_type,
        createdAt: new Date(item.created_at),
      }));
    } catch (error) {
      console.warn("Error fetching connection interests from Supabase:", error);
    }
  }

  // Fall back to localStorage
  const interests = JSON.parse(localStorage.getItem(CONNECTION_INTERESTS_KEY) || "[]");
  return interests.filter((i: any) => i.userId === userId);
}

// Connection Milestones
export async function addConnectionMilestone(milestone: ConnectionMilestone): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getCurrentUserId();
  const client = supabase;
  if (userId && client) {
    try {
      await demoSafeWrite(
        () => client.from("connection_milestones").insert({
          user_id: userId,
          milestone_type: milestone.milestoneType,
          earned_at: new Date().toISOString(),
        }),
        { context: "addConnectionMilestone" }
      );
    } catch (error) {
      console.warn("Error saving milestone to Supabase:", error);
      // Fall back to localStorage
      const milestones = JSON.parse(localStorage.getItem(CONNECTION_MILESTONES_KEY) || "[]");
      milestones.push({ ...milestone, userId });
      localStorage.setItem(CONNECTION_MILESTONES_KEY, JSON.stringify(milestones));
    }
  } else {
    // Demo mode
    const milestones = JSON.parse(localStorage.getItem(CONNECTION_MILESTONES_KEY) || "[]");
    milestones.push({ ...milestone, userId: userId || "demo-user" });
    localStorage.setItem(CONNECTION_MILESTONES_KEY, JSON.stringify(milestones));
  }
}

export async function getConnectionMilestones(userId: string): Promise<ConnectionMilestone[]> {
  if (typeof window === "undefined") return [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("connection_milestones")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        milestoneType: item.milestone_type,
        earnedAt: new Date(item.earned_at),
      }));
    } catch (error) {
      console.warn("Error fetching milestones from Supabase:", error);
    }
  }

  // Fall back to localStorage
  const milestones = JSON.parse(localStorage.getItem(CONNECTION_MILESTONES_KEY) || "[]");
  return milestones.filter((m: any) => m.userId === userId);
}

// Connection Practice Summary (computed from existing data)
export async function getConnectionPracticeSummary(
  userId: string,
  postCount: number = 0,
  commentCount: number = 0,
  spacesJoinedCount: number = 0,
  monthlyIntention?: string,
  lastParticipationDate?: Date
): Promise<ConnectionPracticeSummary> {
  const milestones = await getConnectionMilestones(userId);
  const connectionInterests = await getConnectionInterests(userId);

  return {
    userId,
    reflectionsShared: postCount,
    commentsOffered: commentCount,
    spacesJoined: spacesJoinedCount,
    connectionInterestsSaved: connectionInterests.length,
    monthlyIntention,
    lastParticipationDate,
    milestones,
  };
}

// Check if user has earned a specific milestone
export async function hasMilestone(userId: string, milestoneType: string): Promise<boolean> {
  const milestones = await getConnectionMilestones(userId);
  return milestones.some((m) => m.milestoneType === milestoneType);
}

// Milestone checking helpers
export async function checkAndAwardFirstShare(userId: string, postCount: number): Promise<void> {
  if (postCount === 1 && !(await hasMilestone(userId, "first-share"))) {
    await addConnectionMilestone({
      id: `${userId}-first-share`,
      userId,
      milestoneType: "first-share",
      earnedAt: new Date(),
    });
  }
}

export async function checkAndAwardFirstWitness(userId: string, commentCount: number): Promise<void> {
  if (commentCount === 1 && !(await hasMilestone(userId, "first-witness"))) {
    await addConnectionMilestone({
      id: `${userId}-first-witness`,
      userId,
      milestoneType: "first-witness",
      earnedAt: new Date(),
    });
  }
}

export async function checkAndAwardThoughtfulWitness(
  userId: string,
  commentCount: number
): Promise<void> {
  if (commentCount === 5 && !(await hasMilestone(userId, "thoughtful-witness"))) {
    await addConnectionMilestone({
      id: `${userId}-thoughtful-witness`,
      userId,
      milestoneType: "thoughtful-witness",
      earnedAt: new Date(),
    });
  }
}

export async function checkAndAwardCommunityBuilder(
  userId: string,
  postCount: number,
  commentCount: number
): Promise<void> {
  if (
    postCount >= 3 &&
    commentCount >= 3 &&
    !(await hasMilestone(userId, "community-builder"))
  ) {
    await addConnectionMilestone({
      id: `${userId}-community-builder`,
      userId,
      milestoneType: "community-builder",
      earnedAt: new Date(),
    });
  }
}
