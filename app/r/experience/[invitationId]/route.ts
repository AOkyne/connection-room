import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The "Read & respond" link in an invitation email. Records a visit (for
// the unique-link-visit metric; email link scanners can inflate it a
// little, which the admin page notes) and redirects to the canonical
// thread with the response box open. A GET here never answers, joins or
// changes any content. Signed-out members are sent through sign-in by the
// app layout and returned to the same thread.
export async function GET(request: NextRequest, { params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  let destination = `${base}/app/experience`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (UUID_RE.test(invitationId) && supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: inv } = await supabase
        .from("experience_invitations")
        .select("id, question_id, first_visit_at, visit_count")
        .eq("id", invitationId)
        .maybeSingle();
      if (inv) {
        destination = `${base}/app/experience/${inv.question_id}?respond=1`;
        await supabase
          .from("experience_invitations")
          .update({
            first_visit_at: inv.first_visit_at || new Date().toISOString(),
            visit_count: (inv.visit_count || 0) + 1,
          })
          .eq("id", inv.id);
      }
    } catch (err) {
      console.warn("[experience link] visit not recorded:", err instanceof Error ? err.message : err);
    }
  }
  return NextResponse.redirect(destination, { status: 302 });
}
