/**
 * Invite system data access layer
 * Handles invite code generation, retrieval, and friend tracking
 */

import { supabase } from "@/lib/supabase/client";
import { demoSafeWrite } from "@/lib/demo/demo-mode-guard";
import { generateInviteCode } from "@/lib/utils/invite-code";
import type { Profile } from "./profiles";

const INVITE_CODE_STORAGE_KEY = "connection-room:invite-code";

/**
 * Generate and save invite code for a profile
 */
export async function ensureInviteCode(profile: Profile): Promise<string | null> {
  if (!profile?.displayName) return null;

  // If already has code, return it
  if (profile.inviteCode) {
    return profile.inviteCode;
  }

  const inviteCode = generateInviteCode(profile.displayName);

  // Try to save to Supabase if available (with demo mode protection)
  const client = supabase;
  if (client) {
    try {
      const { error } = await demoSafeWrite(
        () => client
          .from("profiles")
          .update({ invite_code: inviteCode, invite_code_created_at: new Date().toISOString() })
          .eq("user_id", profile.id),
        { context: "ensureInviteCode" }
      );

      if (error) {
        console.warn("Could not save invite code to Supabase:", error);
        // Continue anyway - code is generated, just not persisted
      }
    } catch (err) {
      console.warn("Error saving invite code:", err);
    }
  }

  return inviteCode;
}

/**
 * Get invite code for current user
 */
export async function getMyInviteCode(): Promise<string | null> {
  try {
    // Try Supabase first
    if (supabase) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data } = await supabase
            .from("profiles")
            .select("invite_code")
            .eq("user_id", session.user.id)
            .single();

          if (data?.invite_code) {
            return data.invite_code;
          }
        }
      } catch (err) {
        console.warn("Supabase invite code query failed, trying fallback:", err);
        // Fall through to demo mode
      }
    }

    // Demo/fallback mode: generate and store in localStorage
    if (typeof window !== "undefined") {
      const storedCode = localStorage.getItem("connection-room:demo-invite-code");
      if (storedCode) {
        return storedCode;
      }

      // Generate a demo code if no stored code exists
      const demoCode = generateInviteCode("Demo User");
      try {
        localStorage.setItem("connection-room:demo-invite-code", demoCode);
      } catch (storageErr) {
        console.warn("Could not save to localStorage:", storageErr);
      }
      return demoCode;
    }

    // Server-side fallback: just generate a code
    return generateInviteCode("Demo User");
  } catch (err) {
    console.warn("Error getting invite code:", err);
    // Last resort: generate a demo code
    return generateInviteCode("Demo User");
  }
}

/**
 * Get friends who joined through my invite
 */
export async function getInvitedFriends(): Promise<Profile[]> {
  if (!supabase) return [];

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return [];

    // Get current user's profile to find their ID in profiles table
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (!currentProfile?.id) return [];

    // Get all invite relationships where current user is the inviter
    const { data: relationships } = await supabase
      .from("invite_relationships")
      .select("invited_profile_id")
      .eq("inviter_profile_id", currentProfile.id);

    if (!relationships || relationships.length === 0) return [];

    // Get profile details for each invited friend
    const invitedProfileIds = relationships.map((r) => r.invited_profile_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select(
        `
        id,
        user_id,
        display_name,
        pronouns,
        profile_photo,
        profile_tagline,
        created_at,
        profile_visibility,
        show_in_member_lists
      `
      )
      .in("id", invitedProfileIds)
      .eq("completed_onboarding", true);

    if (!profiles) return [];

    // Transform to Profile interface
    return profiles.map((p: any) => {
      const displayName = p.display_name || "";
      const nameParts = displayName.split(" ");
      return {
        id: p.user_id,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        displayName: p.display_name,
        pronouns: p.pronouns,
        profilePhoto: p.profile_photo,
        profile_tagline: p.profile_tagline,
        memberType: "individual",
        interests: [],
        completedOnboarding: true,
        spacesJoined: [],
        joinedAt: new Date(p.created_at),
        profile_visibility: p.profile_visibility,
        show_in_member_lists: p.show_in_member_lists,
      };
    });
  } catch (err) {
    console.warn("Error getting invited friends:", err);
    return [];
  }
}

/**
 * Get number of friends who joined through my invite
 */
export async function getInvitedFriendsCount(): Promise<number> {
  if (!supabase) return 0;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return 0;

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (!currentProfile?.id) return 0;

    const { count } = await supabase
      .from("invite_relationships")
      .select("*", { count: "exact", head: true })
      .eq("inviter_profile_id", currentProfile.id);

    return count || 0;
  } catch (err) {
    console.warn("Error getting invited friends count:", err);
    return 0;
  }
}

/**
 * Create invite relationship when invited person signs up
 * Called after account creation
 */
export async function createInviteRelationship(
  newProfileId: string,
  inviteCode: string | null
): Promise<boolean> {
  if (!supabase || !inviteCode) return false;

  try {
    // Get new profile ID from database
    const { data: newProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", newProfileId)
      .single();

    if (!newProfile?.id) return false;

    // Find inviter by invite code
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (!inviterProfile?.id) return false; // Invalid code is ok

    // Prevent self-referral
    if (inviterProfile.id === newProfile.id) return false;

    // Create invite relationship (with demo mode protection)
    const client = supabase;
    const { error } = await demoSafeWrite(
      () => client.from("invite_relationships").insert({
        inviter_profile_id: inviterProfile.id,
        invited_profile_id: newProfile.id,
        invite_code: inviteCode,
      }),
      { context: "createInviteRelationship" }
    );

    if (error && !error.message.includes("duplicate")) {
      console.warn("Error creating invite relationship:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Error in createInviteRelationship:", err);
    return false;
  }
}

/**
 * Store invite code in localStorage for preserving through signup
 */
export function storeInviteCodeLocally(inviteCode: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(INVITE_CODE_STORAGE_KEY, inviteCode);
  }
}

/**
 * Get invite code from localStorage
 */
export function getStoredInviteCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(INVITE_CODE_STORAGE_KEY);
}

/**
 * Clear invite code from localStorage
 */
export function clearStoredInviteCode(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(INVITE_CODE_STORAGE_KEY);
  }
}
