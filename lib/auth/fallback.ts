// Fallback authentication when Supabase is unavailable
// Allows demo testing without real backend connectivity

const FALLBACK_AUTH_KEY = "connection-room:fallback-auth";
const FALLBACK_SESSION_KEY = "connection-room:fallback-session";

export interface FallbackUser {
  id: string;
  email: string;
  displayName: string;
}

// Test accounts that work without Supabase
const FALLBACK_TEST_ACCOUNTS = [
  {
    id: "fallback-user-1",
    email: "demo@connection.room",
    password: "Demo123!",
    displayName: "Demo User",
  },
  {
    id: "fallback-user-2",
    email: "test@connection.room",
    password: "Test123!",
    displayName: "Test User",
  },
  {
    id: "fallback-user-3",
    email: "gbese501@hotmail.com",
    password: "Demo123!",
    displayName: "Beta Tester",
  },
];

// Try fallback login with test accounts
export async function fallbackSignInWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; user?: FallbackUser; error?: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const account = FALLBACK_TEST_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password
  );

  if (!account) {
    return {
      success: false,
      error: "Invalid email or password. Try demo@connection.room / Demo123!",
    };
  }

  // Create fallback session
  const user: FallbackUser = {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
  };

  // Store in localStorage
  localStorage.setItem(
    FALLBACK_SESSION_KEY,
    JSON.stringify({
      user,
      timestamp: Date.now(),
    })
  );

  return {
    success: true,
    user,
  };
}

// Create new account in fallback mode
export async function fallbackSignUpWithPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<{ success: boolean; user?: FallbackUser; error?: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In fallback mode, create a user with localStorage
  const userId = `fallback-user-${Date.now()}`;
  const user: FallbackUser = {
    id: userId,
    email,
    displayName: displayName || email.split("@")[0],
  };

  // Store account for future logins
  const accounts = JSON.parse(localStorage.getItem(FALLBACK_AUTH_KEY) || "[]");
  accounts.push({
    id: userId,
    email,
    password,
    displayName: user.displayName,
  });
  localStorage.setItem(FALLBACK_AUTH_KEY, JSON.stringify(accounts));

  // Create session
  localStorage.setItem(
    FALLBACK_SESSION_KEY,
    JSON.stringify({
      user,
      timestamp: Date.now(),
    })
  );

  return {
    success: true,
    user,
  };
}

// Get current fallback session
export function getFallbackSession(): FallbackUser | null {
  const session = localStorage.getItem(FALLBACK_SESSION_KEY);
  if (!session) return null;

  try {
    const { user } = JSON.parse(session);
    return user;
  } catch {
    return null;
  }
}

// Sign out from fallback session
export function fallbackSignOut(): void {
  localStorage.removeItem(FALLBACK_SESSION_KEY);
}
