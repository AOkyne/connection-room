import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

// Emails live in auth.users, not profiles -- profiles has no email column
// at all. Listing them requires the service-role admin API
// (supabase.auth.admin.listUsers()), which only works server-side; there's
// no way for the admin dashboard's client-side profiles query to pull
// email in the same request.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;

  try {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id");

    if (profilesError) throw profilesError;

    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    if (usersError) throw usersError;

    const emailByUserId = new Map(usersData.users.map((u) => [u.id, u.email]));

    // Keyed by profiles.id (the internal row id), matching what the admin
    // dashboard's getAllProfiles() already uses as each member's `id`.
    const emailByProfileId: Record<string, string | undefined> = {};
    (profiles || []).forEach((p: any) => {
      emailByProfileId[p.id] = p.user_id ? emailByUserId.get(p.user_id) : undefined;
    });

    return NextResponse.json({ emails: emailByProfileId });
  } catch (err) {
    console.error("Error fetching member emails:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
