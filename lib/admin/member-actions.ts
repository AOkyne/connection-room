import { supabase } from "@/lib/supabase/client";

export interface AdminMessage {
  id: string;
  fromAdmin: string;
  toUserId: string;
  toUserName: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// Reset member progress and onboarding
export async function resetMemberProgress(userId: string): Promise<boolean> {
  if (!supabase) {
    // Fallback: use localStorage for demo
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("connection-room:member-progress");
      const progress = stored ? JSON.parse(stored) : {};
      progress[userId] = {
        completedOnboarding: false,
        badges: [],
        journeyProgress: 0,
        resetAt: new Date().toISOString(),
      };
      localStorage.setItem(
        "connection-room:member-progress",
        JSON.stringify(progress)
      );
      return true;
    }
    return false;
  }

  try {
    // Update profiles table -- completed_onboarding is snake_case in the DB
    // (this previously sent "completedOnboarding", a column that doesn't
    // exist, so every reset silently failed with a Postgres error). Also
    // clears onboarding_completed_at, since the day5/14/30 drip cron
    // (app/api/cron/drip-emails/route.ts) keys off that being non-null --
    // leaving it set would keep sending drip emails to a member who's
    // supposed to be starting onboarding over.
    const { error } = await supabase
      .from("profiles")
      .update({
        completed_onboarding: false,
        onboarding_completed_at: null,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error resetting member progress:", error);
      return false;
    }

    // Clear earned badges to match what this action tells the admin it does.
    const { error: badgesError } = await supabase
      .from("user_badges")
      .delete()
      .eq("user_id", userId);

    if (badgesError) {
      console.error("Error clearing member badges:", badgesError);
    }

    // Log action
    if (typeof window !== "undefined") {
      const log = {
        action: "reset_progress",
        userId,
        timestamp: new Date().toISOString(),
      };
      const logs = JSON.parse(
        localStorage.getItem("connection-room:admin-logs") || "[]"
      );
      logs.push(log);
      localStorage.setItem(
        "connection-room:admin-logs",
        JSON.stringify(logs.slice(-100))
      ); // Keep last 100
    }

    return true;
  } catch (error) {
    console.error("Error resetting progress:", error);
    return false;
  }
}

// Send admin message to member
export async function sendAdminMessage(
  toUserId: string,
  toUserName: string,
  subject: string,
  message: string,
  adminName: string = "Admin"
): Promise<boolean> {
  try {
    const msg: AdminMessage = {
      id: `msg-${Date.now()}`,
      fromAdmin: adminName,
      toUserId,
      toUserName,
      subject,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };

    if (typeof window !== "undefined") {
      // Store in localStorage
      const messages = JSON.parse(
        localStorage.getItem("connection-room:admin-messages") || "[]"
      );
      messages.push(msg);
      localStorage.setItem(
        "connection-room:admin-messages",
        JSON.stringify(messages)
      );

      // Also store in user-specific inbox
      const userMessages = JSON.parse(
        localStorage.getItem(`connection-room:messages:${toUserId}`) || "[]"
      );
      userMessages.push(msg);
      localStorage.setItem(
        `connection-room:messages:${toUserId}`,
        JSON.stringify(userMessages)
      );
    }

    // Log action
    if (typeof window !== "undefined") {
      const log = {
        action: "send_message",
        toUserId,
        messageId: msg.id,
        timestamp: new Date().toISOString(),
      };
      const logs = JSON.parse(
        localStorage.getItem("connection-room:admin-logs") || "[]"
      );
      logs.push(log);
      localStorage.setItem(
        "connection-room:admin-logs",
        JSON.stringify(logs.slice(-100))
      );
    }

    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
}

// Get admin messages for a user
export function getAdminMessages(userId: string): AdminMessage[] {
  if (typeof window === "undefined") return [];

  const messages = JSON.parse(
    localStorage.getItem(`connection-room:messages:${userId}`) || "[]"
  );
  return messages.sort(
    (a: AdminMessage, b: AdminMessage) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Mark message as read
export function markMessageAsRead(messageId: string, userId: string): void {
  if (typeof window === "undefined") return;

  const messages = JSON.parse(
    localStorage.getItem(`connection-room:messages:${userId}`) || "[]"
  );
  const updated = messages.map((m: AdminMessage) =>
    m.id === messageId ? { ...m, read: true } : m
  );
  localStorage.setItem(
    `connection-room:messages:${userId}`,
    JSON.stringify(updated)
  );
}

// Get unread message count for a user
export function getUnreadMessageCount(userId: string): number {
  if (typeof window === "undefined") return 0;

  const messages = JSON.parse(
    localStorage.getItem(`connection-room:messages:${userId}`) || "[]"
  );
  return messages.filter((m: AdminMessage) => !m.read).length;
}

// Permanently delete one or more members: revokes their auth account
// (cascades through profiles and all related data) and logs the action.
export async function deleteMembers(
  memberIds: string[]
): Promise<{ deletedCount: number; failedCount: number; deletedIds: string[]; errors: string[] }> {
  try {
    const { data: sessionData } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return {
        deletedCount: 0,
        failedCount: memberIds.length,
        deletedIds: [],
        errors: [
          "Not signed in with a real admin account. Admin actions require a real Supabase sign-in, not a demo session.",
        ],
      };
    }

    const response = await fetch("/api/admin/members/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ memberIds }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        deletedCount: 0,
        failedCount: memberIds.length,
        deletedIds: [],
        errors: [data.error || "Request failed"],
      };
    }

    if (typeof window !== "undefined") {
      const log = {
        action: "delete_members",
        memberIds,
        deletedCount: data.deletedCount,
        failedCount: data.failedCount,
        timestamp: new Date().toISOString(),
      };
      const logs = JSON.parse(
        localStorage.getItem("connection-room:admin-logs") || "[]"
      );
      logs.push(log);
      localStorage.setItem(
        "connection-room:admin-logs",
        JSON.stringify(logs.slice(-100))
      );
    }

    const results: { id: string; success: boolean; error?: string }[] = data.results || [];
    const deletedIds = results.filter((r) => r.success).map((r) => r.id);
    const errors = results
      .filter((r) => !r.success)
      .map((r) => `${r.id}: ${r.error || "unknown error"}`);

    return { deletedCount: data.deletedCount, failedCount: data.failedCount, deletedIds, errors };
  } catch (error) {
    console.error("Error deleting members:", error);
    return {
      deletedCount: 0,
      failedCount: memberIds.length,
      deletedIds: [],
      errors: [String(error)],
    };
  }
}

// Send a real email (via SMTP) to one or more members. Distinct from
// sendAdminMessage(), which only delivers an in-app notification.
export async function emailMembers(
  memberIds: string[],
  subject: string,
  message: string
): Promise<{ sentCount: number; failedCount: number; sentIds: string[]; errors: string[] }> {
  try {
    const { data: sessionData } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return {
        sentCount: 0,
        failedCount: memberIds.length,
        sentIds: [],
        errors: [
          "Not signed in with a real admin account. Admin actions require a real Supabase sign-in, not a demo session.",
        ],
      };
    }

    const response = await fetch("/api/admin/members/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ memberIds, subject, message }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        sentCount: 0,
        failedCount: memberIds.length,
        sentIds: [],
        errors: [data.error || "Request failed"],
      };
    }

    if (typeof window !== "undefined") {
      const log = {
        action: "email_members",
        memberIds,
        subject,
        sentCount: data.sentCount,
        failedCount: data.failedCount,
        timestamp: new Date().toISOString(),
      };
      const logs = JSON.parse(
        localStorage.getItem("connection-room:admin-logs") || "[]"
      );
      logs.push(log);
      localStorage.setItem(
        "connection-room:admin-logs",
        JSON.stringify(logs.slice(-100))
      );
    }

    const results: { id: string; success: boolean; error?: string }[] = data.results || [];
    const sentIds = results.filter((r) => r.success).map((r) => r.id);
    const errors = results
      .filter((r) => !r.success)
      .map((r) => `${r.id}: ${r.error || "unknown error"}`);

    return { sentCount: data.sentCount, failedCount: data.failedCount, sentIds, errors };
  } catch (error) {
    console.error("Error emailing members:", error);
    return {
      sentCount: 0,
      failedCount: memberIds.length,
      sentIds: [],
      errors: [String(error)],
    };
  }
}

// Get all admin logs
export function getAdminLogs(): any[] {
  if (typeof window === "undefined") return [];

  return JSON.parse(
    localStorage.getItem("connection-room:admin-logs") || "[]"
  );
}
