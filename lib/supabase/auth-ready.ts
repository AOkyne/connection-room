import { supabase } from "./client";

let authStateInitialized = false;

// Initialize auth state listener on module load
if (typeof window !== "undefined" && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    authStateInitialized = true;
  });
}

/**
 * Wait for Supabase auth state to be initialized
 * Listens for the first auth state change event (which fires on app init)
 */
export async function waitForAuthReady(maxWaitMs: number = 3000): Promise<boolean> {
  if (!supabase) return false;
  if (authStateInitialized) return true;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(authStateInitialized);
    }, maxWaitMs);

    const unsubscribe = supabase.auth.onAuthStateChange(() => {
      authStateInitialized = true;
      clearTimeout(timeout);
      unsubscribe?.();
      resolve(true);
    });
  });
}
