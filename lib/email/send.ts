import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import path from "path";
import { buildBrandedEmailHtml, buildBrandedEmailText } from "./template";

export function hasSmtpConfig(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

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
}): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@trevorjamesla.com",
    to: options.to,
    subject: options.subject,
    text: buildBrandedEmailText(options.paragraphs),
    html: buildBrandedEmailHtml(options.paragraphs),
    replyTo: "support@trevorjamesla.com",
    attachments: getBrandedAttachments(),
  });
}
