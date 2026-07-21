import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import path from "path";
import { buildBrandedEmailHtml, buildBrandedEmailText, buildBroadcastEmailHtml, buildBroadcastEmailText } from "./template";

export function hasSmtpConfig(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Every outbound email sends as Trevor personally -- SMTP2GO only
// authorizes this address anyway, and it reads more personal than a
// generic noreply@ sender.
const FROM_ADDRESS = "Trevor James <trevor@trevorjamesla.com>";
const REPLY_TO_ADDRESS = "trevor@trevorjamesla.com";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
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
    attachments: getBrandedAttachments(),
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
