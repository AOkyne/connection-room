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
  subject: string;
  paragraphs: string[];
  appUrl: string;
  signOff?: string;
}): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: options.to,
    subject: options.subject,
    text: buildBrandedEmailText(options.paragraphs, options.appUrl, options.signOff),
    html: buildBrandedEmailHtml(options.paragraphs, options.appUrl, options.signOff),
    replyTo: REPLY_TO_ADDRESS,
    attachments: getBrandedAttachments(),
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
