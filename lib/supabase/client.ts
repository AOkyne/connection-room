import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
export const isSupabaseConfigured =
  !!(supabaseUrl && supabaseAnonKey);

// Create Supabase client only if configured
let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured && typeof window !== "undefined") {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      storageKey: "connection-room-auth",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export { supabase };
