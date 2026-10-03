import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  activate,
  applySeedUpdate,
  importSeeds,
  loadOverview,
  resolveInvitation,
  resolveReport,
  runDryRun,
  saveSettings,
  sendTestEmail,
  setPaused,
  updateQuestion,
} from "@/lib/experience/admin-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    return NextResponse.json(await loadOverview(auth.supabase));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, userId } = auth;
  const body = await request.json().catch(() => ({}));
  try {
    switch (body.action) {
      case "dry_run":
        return NextResponse.json({ dryRun: await runDryRun(supabase, userId) });
      case "activate":
        if (body.confirm !== true) throw new Error("Confirmation required");
        await activate(supabase, userId);
        break;
      case "pause":
        await setPaused(supabase, userId, true);
        break;
      case "resume":
        await setPaused(supabase, userId, false);
        break;
      case "save_settings":
        await saveSettings(supabase, userId, body.settings || {});
        break;
      case "import_seeds":
        return NextResponse.json({ imported: await importSeeds(supabase, userId) });
      case "apply_seed_update":
        await applySeedUpdate(supabase, userId, String(body.questionId));
        break;
      case "update_question":
        await updateQuestion(supabase, userId, String(body.questionId), body.patch || {});
        break;
      case "resolve_invitation":
        await resolveInvitation(supabase, userId, String(body.invitationId), body.outcome === "sent" ? "sent" : "not_sent");
        break;
      case "resolve_report":
        await resolveReport(supabase, userId, String(body.reportId), body.status === "dismissed" ? "dismissed" : "resolved");
        break;
      case "send_test":
        await sendTestEmail(supabase, userId, String(body.to || ""), body.questionId ? String(body.questionId) : undefined);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Action failed" }, { status: 400 });
  }
}
