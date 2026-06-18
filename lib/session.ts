import { supabase } from "@/lib/supabase/client";

export interface AppSession {
  id: string;
  type: "member" | "admin";
  name: string;
  email?: string;
  supabaseUserId?: string;
  isBeta: boolean;
  createdAt: Date;
}

const SESSION_STORAGE_KEY = "connection-room:session";

// Get current session (either Supabase or demo)
export async function getSession(): Promise<AppSession | null> {
  if (typeof window === "undefined") return null;

  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        return {
          id: session.user.id,
          type: "member",
          name: session.user.email?.split("@")[0] || "User",
          email: session.user.email,
          supabaseUserId: session.user.id,
          isBeta: true,
          createdAt: session.user.created_at ? new Date(session.user.created_at) : new Date(),
        };
      }
    } catch (err) {
      console.error("Error getting Supabase session:", err);
    }
  }

  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Create demo member session
export function createMemberSession(name: string = "Demo Member"): AppSession {
  const session: AppSession = {
    id: `session-${Date.now()}`,
    type: "member",
    name,
    isBeta: false,
    createdAt: new Date(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

// Create demo admin session
export function createAdminSession(name: string = "Demo Admin"): AppSession {
  const session: AppSession = {
    id: `session-${Date.now()}`,
    type: "admin",
    name,
    isBeta: false,
    createdAt: new Date(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

// Clear session (logout)
export async function clearSession(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out from Supabase:", err);
    }
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.type === "admin";
}
