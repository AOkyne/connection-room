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

    // Build email HTML
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #2C2417;">
        <h2 style="color: #A67C2A; margin-top: 0;">🐛 New Bug Report</h2>

        <h3 style="color: #2C2417; margin-top: 24px; margin-bottom: 8px;">Title</h3>
        <p style="margin: 0; background: #F5EFE3; padding: 12px; border-radius: 8px;">${escapeHtml(data.title)}</p>

        <h3 style="color: #2C2417; margin-top: 24px; margin-bottom: 8px;">Severity</h3>
        <p style="margin: 0; background: #F5EFE3; padding: 12px; border-radius: 8px; text-transform: capitalize;">${escapeHtml(data.severity)}</p>

        <h3 style="color: #2C2417; margin-top: 24px; margin-bottom: 8px;">Device Information</h3>
        <p style="margin: 0; background: #F5EFE3; padding: 12px; border-radius: 8px;">
          <strong>Device:</strong> ${escapeHtml(data.device)}<br>
          <strong>OS:</strong> ${escapeHtml(data.os)}
        </p>

        <h3 style="color: #2C2417; margin-top: 24px; margin-bottom: 8px;">Steps to Reproduce</h3>
        <p style="margin: 0; background: #F5EFE3; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(data.steps) || "(not provided)"}</p>

        <h3 style="color: #2C2417; margin-top: 24px; margin-bottom: 8px;">Expected Behavior</h3>
        <p style="margin: 0; background: #F5EFE3; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(data.expected) || "(not provided)"}</p>

        <h3 style="color: #2C2417; margin-top: 24px; margin-bottom: 8px;">Actual Behavior</h3>
        <p style="margin: 0; background: #F5EFE3; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(data.actual) || "(not provided)"}</p>

        ${data.notes ? `
          <h3 style="color: #2C2417; margin-top: 24px; margin-bottom: 8px;">Additional Notes</h3>
          <p style="margin: 0; background: #F5EFE3; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(data.notes)}</p>
        ` : ""}

        ${data.screenshot ? `
          <h3 style="color: #2C2417; margin-top: 24px; margin-bottom: 8px;">Screenshot</h3>
          <img src="${data.screenshot}" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 8px;" alt="Bug screenshot">
        ` : ""}

        <hr style="border: none; border-top: 1px solid #D9CDB8; margin: 24px 0;">
        <p style="color: #7A6F62; font-size: 12px; margin: 0;">
          Submitted from The Connection Room Beta Testing Widget
        </p>
      </div>
    `;

    // Initialize email transporter
    // Using environment variables for SMTP credentials
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@trevorjamesla.com",
      to: "support@trevorjamesla.com",
      subject: `[Beta Bug Report] ${data.title}`,
      html: emailHtml,
      replyTo: process.env.SMTP_FROM || "noreply@trevorjamesla.com",
    });

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
