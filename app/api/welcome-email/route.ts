import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSmtpConfig, sendBrandedEmail } from "@/lib/email/send";

const buildParagraphs = (firstName: string, appUrl: string) => [
  `Hello ${firstName},`,
  `Welcome to The Connection Room. I'm so glad you're here.`,
  `You haven't joined just another online community. You've stepped into a space created for men who are looking for something many of us have been missing: genuine connection, meaningful conversation, and a place where we can show up more honestly, more fully, and more humanly.`,
  `The Connection Room was built on a simple belief: connection is a practice. It grows through presence, curiosity, vulnerability, compassion, and courage. You don't need to be your most confident, articulate, or "put together" self to belong here. You simply need to arrive as you are.`,
  `As you explore, I encourage you to participate. Introduce yourself. Respond to a reflection. Join a conversation that resonates with you. Ask a question. Offer encouragement to another member. Communities don't become meaningful because they exist... they become meaningful because the people in them choose to show up.`,
  `Before you dive in, please take a few moments to read through our Brand Philosophy (${appUrl}/philosophy) and House Rules (${appUrl}/house-rules). They set the tone for the kind of community we're building together. They're not a long list of restrictions, but a shared agreement about how we treat ourselves and one another. We value respect over judgment, curiosity over certainty, consent over assumption, and compassion over criticism. We assume good intentions, honor different lived experiences, and remember that every person here deserves to feel safe, seen, and welcome.`,
  `Because you're joining while the paint is still a little wet, you may occasionally come across something that doesn't work quite as expected. If you notice a bug or have an idea for improving the experience, I'd be grateful if you'd let me know using the Bug Report button in the bottom-right corner of your screen. Your feedback will help us make The Connection Room better for everyone.`,
  `Finally, be gentle with yourself. There is no right way to participate here. Some days you may have a lot to share. Other days you may simply want to read, reflect, and be present. Both are welcome. This isn't about performing or getting everything right. It's about practicing connection, one conversation at a time.`,
  `Thank you for becoming part of this community, especially as one of our early members. You're helping shape the culture that future members will experience, and I'm genuinely grateful you're here.`,
  `Welcome home.`,
];

// Sends the fixed welcome template to the caller's own verified email only
// (derived server-side from their access token, never client-supplied) so
// this can't be used as an open mail relay by an authenticated-but-malicious
// user. No admin role required — any newly signed-up member can trigger
// their own welcome email.
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.email) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  if (!hasSmtpConfig()) {
    return NextResponse.json(
      { error: "Email is not configured on the server (missing SMTP settings)" },
      { status: 500 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const firstName = (profile?.display_name || userData.user.email.split("@")[0]).split(" ")[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

  try {
    await sendBrandedEmail({
      to: userData.user.email,
      subject: "Welcome to The Connection Room!",
      paragraphs: buildParagraphs(firstName, appUrl),
      appUrl,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error sending welcome email:", err);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}
