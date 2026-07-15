import { supabase } from "@/lib/supabase/client";

export interface AppSession {
  id: string;
  type: "member" | "admin";
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  supabaseUserId?: string;
  isBeta: boolean;
  profilePhoto?: string;
  createdAt: Date;
}

const SESSION_STORAGE_KEY = "connection-room:session";
const RECENT_SIGNUPS_KEY = "connection-room:recent-signups";

// Generic placeholder names getSession() has fallen back to historically
// when a real profile lookup failed (several such bugs were fixed
// elsewhere today -- see lib/data/profiles.ts and app/auth/page.tsx).
// A session cached with one of these names is never revalidated once
// stored, so anyone who hit one of those bugs before the fix stays stuck
// seeing "Guest"/"Admin" forever, even after the underlying lookup starts
// working again -- getSession() always trusts the cache unconditionally.
const FALLBACK_SESSION_NAMES = new Set(["Guest User", "Admin", "Demo Admin", "Demo Member"]);

// Helper to generate a profile photo from initials
function generateAvatarUrl(initials: string): string {
  const colors = [
    "#d4a348",
    "#8b6f47",
    "#c97a2a",
    "#a84a2a",
    "#1a0f0a",
    "#a0704a",
  ];
  const color = colors[initials.charCodeAt(0) % colors.length];
  const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="${color}"/><text x="100" y="120" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Get current session (either Supabase or demo)
export async function getSession(): Promise<AppSession | null> {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (stored) {
    const session = JSON.parse(stored) as AppSession;

    // A cached fallback name for a real Supabase-backed session means a
    // profile lookup failed at some point in the past -- worth one retry
    // rather than trusting it forever, since the underlying cause may
    // since have been fixed (as happened today). Demo-only sessions (no
    // supabaseUserId) legitimately use these names on purpose, so leave
    // those alone.
    if (session.supabaseUserId && FALLBACK_SESSION_NAMES.has(session.name) && supabase) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, profile_photo")
          .eq("user_id", session.supabaseUserId)
          .maybeSingle();

        if (profile?.display_name) {
          session.name = profile.display_name;
          if (profile.profile_photo) session.profilePhoto = profile.profile_photo;
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        }
      } catch (err) {
        console.debug("Could not refresh stale fallback session name");
      }
    }

    // Generate profilePhoto if missing
    if (!session.profilePhoto && session.name) {
      const initials = session.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      session.profilePhoto = generateAvatarUrl(initials);
    }
    return session;
  }

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
            .eq("user_id", session.user.id)
            .single();

          if (profile?.display_name) {
            displayName = profile.display_name;
          }
        } catch (err) {
          // Fall back to email username if profile fetch fails
          console.debug("Could not fetch profile for session display name");
        }

        // Generate profile photo from initials
        const initials = displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        const profilePhoto = generateAvatarUrl(initials);

        return {
          id: session.user.id,
          type: "member",
          name: displayName,
          email: session.user.email,
          supabaseUserId: session.user.id,
          isBeta: true,
          profilePhoto,
          createdAt: session.user.created_at ? new Date(session.user.created_at) : new Date(),
        };
      }
    } catch (err) {
      console.error("Error getting Supabase session:", err);
    }
  }

  return null;
}

// Track recent signup for admin dashboard
function trackSignup(session: AppSession): void {
  if (typeof window === "undefined") return;
  const recent = localStorage.getItem(RECENT_SIGNUPS_KEY);
  const signups = recent ? JSON.parse(recent) : [];
  const names = session.name.split(" ");
  signups.unshift({
    id: session.id,
    firstName: session.firstName || names[0] || "",
    lastName: session.lastName || names.slice(1).join(" ") || "",
    email: session.email || "No email",
    type: session.type,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 20 signups
  localStorage.setItem(RECENT_SIGNUPS_KEY, JSON.stringify(signups.slice(0, 20)));
}

// Create demo member session (don't track as signup)
export function createMemberSession(name: string = "Demo Member", profilePhoto?: string): AppSession {
  const session: AppSession = {
    id: `session-${Date.now()}`,
    type: "member",
    name,
    profilePhoto,
    isBeta: false,
    createdAt: new Date(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

// Create demo admin session (don't track as signup)
export function createAdminSession(name: string = "Demo Admin", profilePhoto?: string): AppSession {
  const session: AppSession = {
    id: `session-${Date.now()}`,
    type: "admin",
    name,
    profilePhoto,
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

// Get recent signups for admin dashboard
export function getRecentSignups() {
  if (typeof window === "undefined") return [];
  const recent = localStorage.getItem(RECENT_SIGNUPS_KEY);
  return recent ? JSON.parse(recent) : [];
}
