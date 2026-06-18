// App mode detection: Demo vs Supabase Beta
// This module determines which backend to use based on environment configuration

import { isSupabaseConfigured } from "@/lib/supabase/client";

export type AppMode = "demo" | "beta";

// Get current app mode based on Supabase configuration
export function getAppMode(): AppMode {
  if (isSupabaseConfigured) {
    return "beta";
  }
  return "demo";
}

// Check if running in demo mode
export function isDemoMode(): boolean {
  return getAppMode() === "demo";
}

// Check if running in beta mode with real auth
export function isBetaMode(): boolean {
  return getAppMode() === "beta";
}

// Show this message in dev/admin panel if needed
export function getModeBanner(): string | null {
  if (isDemoMode()) {
    return "Demo mode active. Supabase is not configured.";
  }
  return null;
}
