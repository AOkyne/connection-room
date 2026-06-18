// Demo session management for Phase 1
// In Phase 2, this will connect to Supabase Auth

export interface DemoSession {
  id: string;
  type: "member" | "admin";
  name: string;
  createdAt: Date;
}

const SESSION_STORAGE_KEY = "connection-room:session";

// Get current session
export function getSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Create demo member session
export function createMemberSession(name: string = "Demo Member"): DemoSession {
  const session: DemoSession = {
    id: `session-${Date.now()}`,
    type: "member",
    name,
    createdAt: new Date(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

// Create demo admin session
export function createAdminSession(name: string = "Demo Admin"): DemoSession {
  const session: DemoSession = {
    id: `session-${Date.now()}`,
    type: "admin",
    name,
    createdAt: new Date(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

// Clear session (logout)
export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// Check if user is admin
export function isAdmin(): boolean {
  const session = getSession();
  return session?.type === "admin";
}
