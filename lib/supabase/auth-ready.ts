import { supabase } from "./client";

let authSessionReady = false;

// Initialize auth state listener on module load
if (typeof window !== "undefined" && supabase) {
  // Wait for initial session to load from localStorage
  supabase.auth.getSession().then(() => {
    authSessionReady = true;
  });

  supabase.auth.onAuthStateChange((event, session) => {
    authSessionReady = true;
  });
}

/**
 * Wait for Supabase auth session to be ready
 * Ensures session has been loaded from localStorage before making queries
 */
export async function waitForAuthReady(maxWaitMs: number = 3000): Promise<boolean> {
  if (!supabase) return false;
  if (authSessionReady) return true;

  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkReady = () => {
      if (authSessionReady) {
        resolve(true);
        return;
      }

      if (Date.now() - startTime > maxWaitMs) {
        resolve(authSessionReady);
        return;
      }

      // Check again in 50ms
      setTimeout(checkReady, 50);
    };

    checkReady();
  });
}
