import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { requireAdmin } from "@/lib/auth/require-admin";

interface EmailResult {
  id: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;

  let body: { memberIds?: unknown; subject?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { memberIds, subject, message } = body;
  if (
    !Array.isArray(memberIds) ||
    memberIds.length === 0 ||
    !memberIds.every((id) => typeof id === "string") ||
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return NextResponse.json(
      { error: "memberIds (non-empty array), subject, and message are required" },
      { status: 400 }
    );
  }

  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSmtpConfig) {
    return NextResponse.json(
      { error: "Email is not configured on the server (missing SMTP settings)" },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const results: EmailResult[] = [];

  for (const id of memberIds) {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", id)
        .maybeSingle();

      if (fetchError || !profile?.user_id) {
        results.push({ id, success: false, error: "No linked account found" });
        continue;
      }

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        profile.user_id
      );
      const email = userData?.user?.email;
      if (userError || !email) {
        results.push({ id, success: false, error: "No email on file" });
        continue;
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@trevorjamesla.com",
        to: email,
        subject,
        text: message,
        replyTo: "support@trevorjamesla.com",
      });

      results.push({ id, success: true });
    } catch (err) {
      results.push({ id, success: false, error: String(err) });
    }
  }

  const failed = results.filter((r) => !r.success);
  return NextResponse.json({
    results,
    sentCount: results.length - failed.length,
    failedCount: failed.length,
  });
}
