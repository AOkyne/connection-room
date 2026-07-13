import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import path from "path";

const PARAGRAPHS = (firstName: string, appUrl: string) => [
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

function buildWelcomeEmailText(firstName: string, appUrl: string): string {
  return `${PARAGRAPHS(firstName, appUrl).join("\n\n")}

Warm hugs,

Trevor James
Founder, The Connection Room`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Turns "text (url)" into a clickable link, escaping everything else.
function linkify(paragraph: string): string {
  return escapeHtml(paragraph).replace(
    /(https?:\/\/[^\s)]+)/g,
    (url) => `<a href="${url}" style="color:#B8892F;">${url}</a>`
  );
}

function buildWelcomeEmailHtml(firstName: string, appUrl: string): string {
  const bodyParagraphs = PARAGRAPHS(firstName, appUrl)
    .map(
      (p) =>
        `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#1a0f0a;">${linkify(p)}</p>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#F7F1E3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F1E3;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#FFFDF8;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 32px 8px;">
                <img src="cid:welcome-logo" alt="The Connection Room" width="240" style="display:block;max-width:240px;height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px;">
                ${bodyParagraphs}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  <tr>
                    <td style="padding-right:16px;vertical-align:middle;">
                      <img src="cid:trevor-photo" alt="Trevor James" width="64" height="64" style="display:block;border-radius:50%;object-fit:cover;" />
                    </td>
                    <td style="vertical-align:middle;font-size:15px;line-height:1.4;color:#1a0f0a;">
                      <div>Warm hugs,</div>
                      <div style="font-weight:600;margin-top:4px;">Trevor James</div>
                      <div style="color:#a0704a;">Founder, The Connection Room</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

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

  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSmtpConfig) {
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

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@trevorjamesla.com",
      to: userData.user.email,
      subject: "Welcome to The Connection Room!",
      text: buildWelcomeEmailText(firstName, appUrl),
      html: buildWelcomeEmailHtml(firstName, appUrl),
      replyTo: "support@trevorjamesla.com",
      attachments: [
        {
          filename: "connection-room-logo.png",
          content: readFileSync(path.join(process.cwd(), "public/email/welcome-logo.png")),
          cid: "welcome-logo",
        },
        {
          filename: "trevor-james.jpg",
          content: readFileSync(
            path.join(process.cwd(), "public/email/welcome-signature-photo.jpg")
          ),
          cid: "trevor-photo",
        },
      ],
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error sending welcome email:", err);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}
