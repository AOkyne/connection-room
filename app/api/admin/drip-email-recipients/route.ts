import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

const ONBOARDING_INCOMPLETE_KEYS = ["onboarding-incomplete-day1", "onboarding-incomplete-day3", "onboarding-incomplete-day5"];

// Who actually received an onboarding-incomplete reminder email, and when
// -- drip_emails_sent (migration 020) only gets a row inserted right after
// a real send succeeds (see app/api/cron/drip-emails/route.ts), so this is
// ground truth for "did this member get emailed", not an inference from
// candidate-matching logic the way the onboarding funnel above it is.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;

  const daysParam = request.nextUrl.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 5;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: sent, error: sentError } = await supabase
      .from("drip_emails_sent")
      .select("id, profile_id, email_key, sent_at")
      .in("email_key", ONBOARDING_INCOMPLETE_KEYS)
      .gte("sent_at", since)
      .order("sent_at", { ascending: false });

    if (sentError) throw sentError;

    if (!sent || sent.length === 0) {
      return NextResponse.json({ recipients: [] });
    }

    const profileIds = [...new Set(sent.map((s) => s.profile_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, first_name, last_name")
      .in("id", profileIds);

    if (profilesError) throw profilesError;

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));

    // Same approach as /api/admin/members/emails -- email lives in
    // auth.users, not profiles, and listUsers() in one call is far cheaper
    // than a getUserById round trip per recipient.
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;
    const emailByUserId = new Map(usersData.users.map((u) => [u.id, u.email]));

    const recipients = sent.map((s) => {
      const profile = profileById.get(s.profile_id);
      return {
        profileId: s.profile_id,
        name: profile
          ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.display_name || "(unnamed)"
          : "(deleted profile)",
        email: profile?.user_id ? emailByUserId.get(profile.user_id) || null : null,
        emailKey: s.email_key,
        sentAt: s.sent_at,
      };
    });

    return NextResponse.json({ recipients });
  } catch (err) {
    console.error("Error fetching drip email recipients:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}
