import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { readFileSync } from "fs";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBrandedEmailHtml, buildBrandedEmailText, buildBroadcastEmailHtml, buildBroadcastEmailText } from "./template";

export function hasSmtpConfig(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export type EmailCategory =
  | "welcome"
  | "drip_onboarding"
  | "drip_incomplete_onboarding"
  | "digest"
  | "post_notification"
  | "broadcast"
  | "admin_direct";

// Records a real send into sent_emails (migration 069) so the admin
// email-history page has something to show. Called explicitly at each
// send call site (not threaded through sendBrandedEmail() etc. as an
// extra param) -- every call site already has its own service-role
// supabase client and the recipient/subject in scope, and keeping this
// send-only module's functions focused on sending keeps them reusable
// without a DB dependency. Best-effort: the email has already gone out by
// the time this runs, so a logging failure must never surface as a send
// failure -- swallow after logging the error.
export async function logEmailSend(
  supabase: SupabaseClient,
  params: {
    category: EmailCategory;
    to: string;
    cc?: string;
    subject: string;
    recipientUserId?: string | null;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("sent_emails").insert({
      category: params.category,
      to_email: params.to,
      cc_email: params.cc || null,
      subject: params.subject,
      recipient_user_id: params.recipientUserId || null,
    });
    if (error) console.error("Failed to log sent email:", error);
  } catch (err) {
    console.error("Failed to log sent email:", err);
  }
}

// Every outbound email sends as Trevor personally -- SMTP2GO only
// authorizes this address anyway, and it reads more personal than a
// generic noreply@ sender.
const FROM_ADDRESS = "Trevor James <trevor@trevorjamesla.com>";
const REPLY_TO_ADDRESS = "trevor@trevorjamesla.com";

// Reused across calls within the same warm serverless invocation (and
// across invocations on a warm container) instead of opening a brand-new
// SMTP connection -- TLS handshake included -- for every single email.
// This matters a lot for batch senders (digest/drip crons looping over
// 100+ recipients sequentially): creating a fresh transporter per send
// was the dominant cost pushing space-digest-emails past its 60s
// function timeout. `pool: true` lets nodemailer additionally reuse and
// multiplex actual socket connections across sendMail() calls.
// Typed as the base Mail interface (same type every sendMail() call site
// already assumes) rather than nodemailer's pool-specific overload return
// type, which TS can't cleanly assign to a plain nullable variable.
let cachedTransporter: Mail | null = null;

function getTransporter(): Mail {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      pool: true,
      maxConnections: 5,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return cachedTransporter;
}

function getBrandedAttachments() {
  return [
    {
      filename: "connection-room-logo.png",
      content: readFileSync(path.join(process.cwd(), "public/email/welcome-logo.png")),
      cid: "welcome-logo",
    },
    {
      filename: "trevor-james.jpg",
      content: readFileSync(path.join(process.cwd(), "public/email/welcome-signature-photo.jpg")),
      cid: "trevor-photo",
    },
  ];
}

export async function sendBrandedEmail(options: {
  to: string;
  cc?: string;
  subject: string;
  paragraphs: string[];
  appUrl: string;
  signOff?: string;
  // Extra attachments (e.g. a calendar invite) on top of the fixed
  // branding images -- merged in, not a replacement for them.
  attachments?: Mail.Attachment[];
}): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: options.to,
    ...(options.cc ? { cc: options.cc } : {}),
    subject: options.subject,
    text: buildBrandedEmailText(options.paragraphs, options.appUrl, options.signOff),
    html: buildBrandedEmailHtml(options.paragraphs, options.appUrl, options.signOff),
    replyTo: REPLY_TO_ADDRESS,
    attachments: [...getBrandedAttachments(), ...(options.attachments || [])],
  });
}

// Immediate space-activity notification -- one email per new post, sent
// only to members whose notification_frequency is "immediate" for the
// space the post landed in. Same branded shell as sendBrandedEmail; the
// CTA button (via appUrl) links straight to the space that got the new
// post, not just the app root, so the click lands where the content is.
export async function sendPostNotificationEmail(options: {
  to: string;
  spaceName: string;
  spaceUrl: string;
  authorName: string;
  excerpt: string;
}): Promise<void> {
  await sendBrandedEmail({
    to: options.to,
    subject: `New post in ${options.spaceName}`,
    paragraphs: [
      `${options.authorName} just shared something new in ${options.spaceName}.`,
      options.excerpt,
      "Manage how often you hear about new posts anytime from your profile settings.",
    ],
    appUrl: options.spaceUrl,
  });
}

// Daily/weekly digest -- one email summarizing all new posts across every
// space a member has joined since their last digest. Sent only when there
// is at least one new post to report (callers should skip sending
// entirely otherwise, not call this with an empty list).
export async function sendDigestEmail(options: {
  to: string;
  frequency: "daily" | "weekly";
  appUrl: string;
  spaceBreakdown: Array<{ spaceName: string; count: number }>;
}): Promise<void> {
  const totalCount = options.spaceBreakdown.reduce((sum, s) => sum + s.count, 0);
  const period = options.frequency === "daily" ? "today" : "this week";
  const breakdownLines = options.spaceBreakdown
    .map((s) => `${s.spaceName}: ${s.count} new post${s.count === 1 ? "" : "s"}`)
    .join("\n");

  await sendBrandedEmail({
    to: options.to,
    subject: `${totalCount} new post${totalCount === 1 ? "" : "s"} in your spaces`,
    paragraphs: [
      `Here's what's new in your spaces ${period}:`,
      breakdownLines,
      "Manage how often you hear about new posts anytime from your profile settings.",
    ],
    appUrl: `${options.appUrl}/app/spaces`,
  });
}

// Admin broadcast composer (announcements to some or all members) -- same
// branded shell and attachments as sendBrandedEmail, but the body is
// arbitrary rich-text HTML from the admin's editor rather than a fixed
// paragraphs array, and the signature is the fuller admin-authored one
// (name, founder title, and credential line) instead of a short sign-off.
export async function sendBroadcastEmail(options: {
  to: string;
  subject: string;
  bodyHtml: string;
}): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: options.to,
    subject: options.subject,
    text: buildBroadcastEmailText(options.bodyHtml),
    html: buildBroadcastEmailHtml(options.bodyHtml),
    replyTo: REPLY_TO_ADDRESS,
    attachments: getBrandedAttachments(),
  });
}
