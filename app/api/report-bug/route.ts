import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface BugReportData {
  name: string;
  email: string;
  title: string;
  severity: string;
  device: string;
  os: string;
  steps: string;
  expected: string;
  actual: string;
  notes: string;
  screenshot: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const data: BugReportData = await request.json();

    // Validate required fields
    if (!data.title || !data.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (data.notes.length > 4000) {
      return NextResponse.json(
        { error: "Notes exceed 4000 character limit" },
        { status: 400 }
      );
    }

    // Build email text
    const emailText = `
🐛 New Bug Report

From: ${data.name || "(not provided)"} ${data.email ? `<${data.email}>` : "(no email provided)"}

Title: ${data.title}
Severity: ${data.severity}
Device: ${data.device}
OS: ${data.os}

Steps to Reproduce:
${data.steps || "(not provided)"}

Expected Behavior:
${data.expected || "(not provided)"}

Actual Behavior:
${data.actual || "(not provided)"}

${data.notes ? `Additional Notes:\n${data.notes}` : ""}

---
Submitted from The Connection Room Beta Testing Widget
    `;

    // Check if SMTP is configured
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (hasSmtpConfig) {
      // Production: Send via email
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Reply-to the submitter directly when they gave a real email --
      // this is the whole point of collecting it: "Reply" in Trevor's
      // inbox should reach the actual person, not himself. A basic shape
      // check only (this is a mailer header, not a data validation
      // boundary) -- falls back to the previous behavior if it's missing
      // or obviously not an email.
      const submitterEmail = data.email?.trim();
      const replyTo =
        submitterEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)
          ? submitterEmail
          : "trevor@trevorjamesla.com";

      // The widget lets someone pick a screenshot and even previews it in
      // the UI, but data.screenshot was never actually used here -- it was
      // received and silently dropped, so no screenshot has ever reached
      // an actual bug report email. Parse the data URL (e.g.
      // "data:image/png;base64,...." from FileReader.readAsDataURL()) into
      // a real nodemailer attachment.
      const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];
      if (data.screenshot) {
        const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(data.screenshot);
        if (match) {
          const [, contentType, base64] = match;
          const extension = contentType.split("/")[1] || "png";
          attachments.push({
            filename: `screenshot.${extension}`,
            content: Buffer.from(base64, "base64"),
            contentType,
          });
        }
      }

      await transporter.sendMail({
        from: "Trevor James <trevor@trevorjamesla.com>",
        to: "support@trevorjamesla.com",
        subject: `[Beta Bug Report] ${data.title}${data.name ? ` (${data.name})` : ""}`,
        text: emailText + (data.screenshot && attachments.length === 0 ? "\n\n(A screenshot was attached but couldn't be processed.)" : ""),
        replyTo,
        attachments,
      });
    } else {
      // Development: Log to console
      console.log("\n📧 BUG REPORT SUBMITTED:\n", emailText);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bug report error:", error);
    return NextResponse.json(
      { error: "Failed to submit bug report" },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
