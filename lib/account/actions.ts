import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";

// Deactivate the signed-in member's own account: hides them from other
// members' space lists and the discovery pool (lib/data/profiles.ts's
// getPublicProfilesBySpace/getDiscoverableMembers, migration 062) without
// deleting anything. Reversible -- signing back in reactivates
// automatically (see app/app/layout.tsx's session check).
export async function deactivateOwnAccount(): Promise<boolean> {
  if (!supabase) return false;
  const client = supabase;

  const {
    data: { session },
  } = await client.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return false;

  const { error } = await demoSafeWrite(
    () =>
      client
        .from("profiles")
        .update({ deactivated_at: new Date().toISOString() })
        .eq("user_id", userId),
    { context: "deactivateOwnAccount" }
  );

  return !error;
}

// Permanently delete the signed-in member's own account: their real auth
// account, their profile, and everything referencing it (cascading
// foreign keys). Irreversible -- the caller is responsible for its own
// confirmation UI before calling this.
export async function deleteOwnAccount(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Not signed in." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return { success: false, error: "Not signed in with a real account." };
  }

  try {
    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || "Request failed" };
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting own account:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
