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
    // Update profiles table
    const { error } = await supabase
      .from("profiles")
      .update({
        completedOnboarding: false,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error resetting member progress:", error);
      return false;
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

// Get all admin logs
export function getAdminLogs(): any[] {
  if (typeof window === "undefined") return [];

  return JSON.parse(
    localStorage.getItem("connection-room:admin-logs") || "[]"
  );
}
