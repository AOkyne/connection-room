import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";

// Self-service account deletion. Deliberately mirrors
// app/api/admin/members/delete/route.ts's approach (deleting the auth user
// cascades through profiles.user_id and everything downstream of
// profiles.id), but scoped to the caller's own account only -- requireUser()
// returns the userId decoded from the caller's own verified access token,
// never a client-supplied id, so there is no way to pass someone else's id
// here.
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase, userId } = auth;

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
