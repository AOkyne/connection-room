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
const RECENT_SIGNUPS_KEY = "connection-room:recent-signups";

// Get current session (either Supabase or demo)
export async function getSession(): Promise<AppSession | null> {
  if (typeof window === "undefined") return null;

  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch profile to get display name
        let displayName = session.user.email?.split("@")[0] || "User";
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", session.user.id)
            .single();

          if (profile?.display_name) {
            displayName = profile.display_name;
          }
        } catch (err) {
          // Fall back to email username if profile fetch fails
          console.debug("Could not fetch profile for session display name");
        }

        return {
          id: session.user.id,
          type: "member",
          name: displayName,
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

// Track recent signup for admin dashboard
function trackSignup(session: AppSession): void {
  if (typeof window === "undefined") return;
  const recent = localStorage.getItem(RECENT_SIGNUPS_KEY);
  const signups = recent ? JSON.parse(recent) : [];
  signups.unshift({
    id: session.id,
    name: session.name,
    email: session.email || "No email",
    type: session.type,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 20 signups
  localStorage.setItem(RECENT_SIGNUPS_KEY, JSON.stringify(signups.slice(0, 20)));
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
    trackSignup(session);
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
    trackSignup(session);
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

// Get recent signups for admin dashboard
export function getRecentSignups() {
  if (typeof window === "undefined") return [];
  const recent = localStorage.getItem(RECENT_SIGNUPS_KEY);
  return recent ? JSON.parse(recent) : [];
}
