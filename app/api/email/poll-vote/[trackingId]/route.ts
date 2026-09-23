import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

// No auth by design -- clicked directly from an email client, same trust
// boundary as /api/email/click/[id]. The identity behind the vote is
// resolved server-side from sent_emails.recipient_user_id (never from
// anything in the URL a recipient could edit or forward), and the actual
// write goes through submit_poll_vote_as() -- migration 099 -- which is
// grantable to service_role only, so this route is the ONLY caller able
// to record a vote "as" someone else's account.
export async function GET(request: NextRequest, { params }: { params: Promise<{ trackingId: string }> }) {
  const { trackingId } = await params;
  const optionId = request.nextUrl.searchParams.get("option");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // A vote failure must never show the recipient a broken page -- the
  // fallback is always a normal redirect into the app, same principle as
  // the click/open routes. Only ever upgraded to the poll's own results
  // page once every step below actually succeeds.
  let destination = FALLBACK_URL;

  if (UUID_RE.test(trackingId) && optionId && UUID_RE.test(optionId) && supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: sentEmail } = await supabase
        .from("sent_emails")
        .select("recipient_user_id")
        .eq("id", trackingId)
        .maybeSingle();

      const { data: option } = await supabase
        .from("poll_options")
        .select("poll_id")
        .eq("id", optionId)
        .maybeSingle();

      if (sentEmail?.recipient_user_id && option?.poll_id) {
        const { error } = await supabase.rpc("submit_poll_vote_as", {
          p_user_id: sentEmail.recipient_user_id,
          p_poll_id: option.poll_id,
          p_option_id: optionId,
        });
        if (!error) {
          destination = `${FALLBACK_URL}/app/polls/${option.poll_id}`;
        } else {
          console.warn("Error recording email poll vote:", error);
        }
      }
    } catch (err) {
      console.warn("Error recording email poll vote:", err);
    }
  }

  return NextResponse.redirect(destination, { status: 302 });
}
