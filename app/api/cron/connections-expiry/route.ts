import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendConnectionLifecycleEmail, logEmailSend, hasSmtpConfig } from "@/lib/email/send";
import { isHalfwayReminderDue, isClosingSoonReminderDue, getDueLiveReminderKey } from "@/lib/utils/connectionReminders";

// Expires stale async-connection invitations/rounds and sends round/live
// reminders. Not registered in vercel.json -- same reason as
// weekly-prompts/space-digest-emails (Vercel Hobby's 2-cron cap is already
// spent) -- meant to be hit externally (e.g. cron-job.org) every 15-30
// minutes with the same CRON_SECRET bearer pattern used everywhere else.
//
// Idempotent per row: every mutation here is a status/timestamp check
// before writing (e.g. only expire rows still in an expirable status), and
// every notification is deduped through connection_notification_log
// (migration 077, extended by 078 with a notification_type column) keyed on
// (connection_id, user_id, notification_type) -- a late or doubled-up cron
// run cannot double-expire a row or double-send a reminder.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

  const results = {
    expiredInvitations: 0,
    expiredRounds: 0,
    remindersSent: 0,
    liveRemindersSent: 0,
    errors: [] as string[],
  };

  // auth.admin.listUsers() once, reused for every email lookup below --
  // same cost-saving pattern as space-digest-emails (measured ~360ms per
  // per-user admin.getUserById() call, not worth paying per-notification).
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map((userList?.users || []).map((u) => [u.id, u.email]));

  const canEmail = hasSmtpConfig();

  async function notifyOnce(
    connectionId: string,
    userId: string,
    notificationType: string,
    subject: string,
    paragraphs: string[]
  ) {
    const { error: dedupError } = await supabase
      .from("connection_notification_log")
      .insert({ connection_id: connectionId, notified_user_id: userId, notification_type: notificationType });

    // Unique constraint violation means we already sent this one -- expected
    // and not an error condition.
    if (dedupError) {
      if (!String(dedupError.message || "").includes("duplicate")) {
        results.errors.push(`notify ${notificationType} ${connectionId}: ${dedupError.message}`);
      }
      return;
    }

    if (!canEmail) return;
    const email = emailByUserId.get(userId);
    if (!email) return;

    try {
      await sendConnectionLifecycleEmail({
        to: email,
        subject,
        paragraphs,
        appUrl: `${appUrl}/app/connections/${connectionId}`,
      });
      await logEmailSend(supabase, {
        category: "connection_lifecycle",
        to: email,
        subject,
        recipientUserId: userId,
      });
    } catch (err) {
      results.errors.push(`email ${notificationType} ${connectionId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // -------------------------------------------------------------------
  // 1. Expire unanswered invitations.
  // -------------------------------------------------------------------
  const { data: staleInvitations, error: invitationsError } = await supabase
    .from("connections")
    .select("id")
    .eq("status", "awaiting_acceptance")
    .lt("invitation_expires_at", new Date().toISOString());

  if (invitationsError) {
    results.errors.push(`load stale invitations: ${invitationsError.message}`);
  } else {
    for (const row of staleInvitations || []) {
      const { error } = await supabase
        .from("connections")
        .update({ status: "expired", expired_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", "awaiting_acceptance"); // re-check status at write time, not just read time

      if (error) results.errors.push(`expire invitation ${row.id}: ${error.message}`);
      else results.expiredInvitations++;
    }
  }

  // -------------------------------------------------------------------
  // 2. Expire connections whose current round's response window has
  //    fully lapsed with at least one participant not having submitted.
  // -------------------------------------------------------------------
  const EXPIRABLE_STATUSES = ["active", "extended", "awaiting_next_round", "accepted_by_one", "waiting_for_participant"];

  const { data: staleConnections, error: staleError } = await supabase
    .from("connections")
    .select("id, current_round_number")
    .in("status", EXPIRABLE_STATUSES)
    .lt("response_deadline_at", new Date().toISOString());

  if (staleError) {
    results.errors.push(`load stale connections: ${staleError.message}`);
  } else {
    for (const row of staleConnections || []) {
      const { data: openRound } = await supabase
        .from("connection_rounds")
        .select("id")
        .eq("connection_id", row.id)
        .eq("round_number", row.current_round_number)
        .eq("status", "open")
        .lt("response_deadline_at", new Date().toISOString())
        .maybeSingle();

      if (!openRound) continue; // already revealed/completed since this read started -- nothing to expire

      const { error } = await supabase
        .from("connections")
        .update({ status: "expired", expired_at: new Date().toISOString() })
        .eq("id", row.id)
        .in("status", EXPIRABLE_STATUSES);

      if (error) results.errors.push(`expire connection ${row.id}: ${error.message}`);
      else results.expiredRounds++;
    }
  }

  // -------------------------------------------------------------------
  // 3. Round response reminders: halfway through the window, and a few
  //    hours before it closes. Only sent to participants who haven't
  //    submitted yet.
  // -------------------------------------------------------------------
  const { data: openRounds, error: openRoundsError } = await supabase
    .from("connection_rounds")
    .select("id, connection_id, opened_at, response_deadline_at")
    .eq("status", "open");

  if (openRoundsError) {
    results.errors.push(`load open rounds: ${openRoundsError.message}`);
  } else {
    const now = new Date();
    for (const round of openRounds || []) {
      const opened = new Date(round.opened_at);
      const deadline = new Date(round.response_deadline_at);

      const { data: unsubmitted } = await supabase
        .from("connection_responses")
        .select("participant_id, connection_participants!inner(user_id)")
        .eq("connection_round_id", round.id)
        .is("submitted_at", null);

      for (const r of unsubmitted || []) {
        const userId = (r as any).connection_participants.user_id;

        if (isHalfwayReminderDue(opened, deadline, now)) {
          await notifyOnce(round.connection_id, userId, `round_halfway:${round.id}`, "Your guided connection is waiting for a response", [
            "You have a guided connection round open, whenever you have space to answer.",
            "Respond when you have space -- there's no rush, just a window that's now past its halfway point.",
          ]);
          results.remindersSent++;
        }

        if (isClosingSoonReminderDue(deadline, now)) {
          await notifyOnce(round.connection_id, userId, `round_closing:${round.id}`, "A guided connection window closes soon", [
            "This connection's response window closes in a few hours.",
            "If you'd like more time, you can use your one-time extension from the connection page.",
          ]);
          results.remindersSent++;
        }
      }
    }
  }

  // -------------------------------------------------------------------
  // 4. Scheduled live conversation reminders: 24h / 1h / 10min before.
  // -------------------------------------------------------------------
  const { data: scheduledSessions, error: sessionsError } = await supabase
    .from("connection_live_sessions")
    .select("id, connection_id, scheduled_start_at")
    .eq("status", "scheduled")
    .not("scheduled_start_at", "is", null);

  if (sessionsError) {
    results.errors.push(`load scheduled sessions: ${sessionsError.message}`);
  } else {
    const SUBJECT_BY_REMINDER_KEY: Record<string, string> = {
      live_10min: "Your live conversation starts in 10 minutes",
      live_1hour: "Your live conversation starts in about an hour",
      live_24hour: "Your live conversation is tomorrow",
    };

    for (const session of scheduledSessions || []) {
      const startsAt = new Date(session.scheduled_start_at as string);
      const reminderKey = getDueLiveReminderKey(startsAt, new Date());
      if (!reminderKey) continue;
      const subject = SUBJECT_BY_REMINDER_KEY[reminderKey];

      const { data: participants } = await supabase
        .from("connection_participants")
        .select("user_id")
        .eq("connection_id", session.connection_id);

      for (const p of participants || []) {
        await notifyOnce(session.connection_id, p.user_id, `${reminderKey}:${session.id}`, subject, [
          "You have a scheduled live conversation coming up in The Connection Room.",
          "It'll open in your connection's detail page a few minutes before the scheduled time.",
        ]);
        results.liveRemindersSent++;
      }
    }
  }

  return NextResponse.json({ results });
}
