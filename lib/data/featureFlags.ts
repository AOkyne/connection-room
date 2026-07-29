// Reads platform_settings (migration 026) from the browser via the anon
// key -- every setting this module touches has is_secret=false, so the
// existing "settings_public_read" RLS policy already allows this without
// any new API route. Mirrors the existing feature_connections_enabled /
// is_feature_enabled() pattern; this file is the first place that pattern
// gets a TypeScript-side reader.

import { supabase } from "@/lib/supabase/client";

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", key)
      .maybeSingle();

    if (error || data == null) return fallback;
    return data.setting_value as T;
  } catch {
    return fallback;
  }
}

// Gradual rollout: the top-level flag wins once true (on for everyone);
// while it's false, a non-empty beta allowlist still turns the feature on
// for just those user_ids. See migration 079's own comment for the
// intended admin rollout sequence.
export async function isAsyncConnectionsEnabled(userId: string | null | undefined): Promise<boolean> {
  const [enabled, betaUserIds] = await Promise.all([
    getSetting<boolean>("feature_async_connections_enabled", false),
    getSetting<string[]>("connection_async_beta_user_ids", []),
  ]);

  if (enabled) return true;
  if (userId && Array.isArray(betaUserIds) && betaUserIds.includes(userId)) return true;
  return false;
}
