import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface BugReportData {
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

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@trevorjamesla.com",
        to: "support@trevorjamesla.com",
        subject: `[Beta Bug Report] ${data.title}`,
        text: emailText,
        replyTo: process.env.SMTP_FROM || "noreply@trevorjamesla.com",
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
