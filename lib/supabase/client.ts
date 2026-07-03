import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
export const isSupabaseConfigured =
  !!(supabaseUrl && supabaseAnonKey);

// Create Supabase client only if configured
// Note: In browser context, this will automatically use localStorage for session persistence
let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  const isBrowser = typeof window !== "undefined";
  supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: isBrowser ? window.localStorage : undefined,
    },
  });

  // On first client initialization, restore session from localStorage
  if (isBrowser) {
    supabase.auth
      .refreshSession()
      .catch((err) => {
        // Ignore errors - session might not exist yet
        console.debug("Initial session refresh attempted");
      });
  }
}

export { supabase };
