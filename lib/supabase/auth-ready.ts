import { supabase } from "./client";

/**
 * Wait for Supabase session to be initialized from localStorage
 * This ensures auth tokens are available for protected queries
 */
export async function waitForAuthReady(maxWaitMs: number = 3000): Promise<boolean> {
  if (!supabase) return false;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        return true; // Session is ready
      }
    } catch (err) {
      // Ignore errors during initialization
    }

    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return false;
}
