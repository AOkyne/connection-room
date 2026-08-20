import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isTrackableClickTarget } from "@/lib/email/template";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

// No auth by design -- clicked directly from an email client, which
// can't send an Authorization header. This is a PUBLIC redirect
// endpoint, which makes it a classic open-redirect target if it isn't
// careful: isTrackableClickTarget() (the same allowlist
// lib/email/template.ts uses when first generating these links) is
// re-checked here independently, so even a hand-crafted request to this
// route with an arbitrary ?url= can never be used to redirect through
// our trusted domain to somewhere we don't control -- redirect only
// proceeds for an allowlisted host, otherwise this just sends the
// visitor to the app itself.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rawUrl = request.nextUrl.searchParams.get("url");
  const destination = rawUrl && isTrackableClickTarget(rawUrl) ? rawUrl : FALLBACK_URL;

  if (UUID_RE.test(id)) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: existing } = await supabase
          .from("sent_emails")
          .select("clicked_at, click_count")
          .eq("id", id)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("sent_emails")
            .update({
              clicked_at: existing.clicked_at || new Date().toISOString(),
              click_count: (existing.click_count || 0) + 1,
            })
            .eq("id", id);
        }
      } catch (err) {
        // A tracking failure must never block the redirect -- the
        // recipient is trying to actually go somewhere.
        console.warn("Error recording email click:", err);
      }
    }
  }

  return NextResponse.redirect(destination, { status: 302 });
}
