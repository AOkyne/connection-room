import { supabase } from "@/lib/supabase/client";

// The workshop-ops proxy requires a signed-in session. Returns null when there
// isn't one (signed out, or the app is running without a real database), in
// which case the webhook is skipped rather than sent.
export async function getAuthHeader(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}
