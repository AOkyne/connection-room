import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

// invite_relationships stores profiles.id (the internal row PK), not
// user_id, so resolving "who did I invite" requires a profiles.id lookup
// that ordinary members can no longer do directly against profiles now that
// it's locked to owner+admin SELECT (migration 039). This route does that
// lookup server-side with the service-role key and returns only safe,
// public-profile-equivalent fields.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, userId } = auth;

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!currentProfile?.id) {
    return NextResponse.json({ friends: [] });
  }

  const { data: relationships } = await supabase
    .from("invite_relationships")
    .select("invited_profile_id")
    .eq("inviter_profile_id", currentProfile.id);

  if (!relationships || relationships.length === 0) {
    return NextResponse.json({ friends: [] });
  }

  const invitedProfileIds = relationships.map((r) => r.invited_profile_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, pronouns, profile_photo, created_at")
    .in("id", invitedProfileIds)
    .eq("completed_onboarding", true);

  return NextResponse.json({ friends: profiles || [] });
}
