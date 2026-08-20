import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// A single 1x1 transparent GIF, base64-encoded -- the smallest valid GIF
// that exists. Served identically regardless of whether the DB update
// below succeeds; a tracking pixel must never come back as a broken
// image or an error, since that's the one thing an email client
// actually renders (or, for most clients, doesn't render at all --
// that's expected, not a bug, see lib/email/template.ts's comment on
// pixel-based tracking's real limitations).
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
  "base64"
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // No auth on this route by design -- it's requested directly by an
  // email client's image loader, which can't send an Authorization
  // header. UUID-shape check is the only real input validation available
  // (and enough to keep a malformed id from ever reaching the DB call).
  if (UUID_RE.test(id)) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: existing } = await supabase
          .from("sent_emails")
          .select("opened_at, open_count")
          .eq("id", id)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("sent_emails")
            .update({
              opened_at: existing.opened_at || new Date().toISOString(),
              open_count: (existing.open_count || 0) + 1,
            })
            .eq("id", id);
        }
      } catch (err) {
        // Never let a tracking failure affect the response -- the pixel
        // still has to load.
        console.warn("Error recording email open:", err);
      }
    }
  }

  return new NextResponse(new Uint8Array(TRANSPARENT_GIF), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
